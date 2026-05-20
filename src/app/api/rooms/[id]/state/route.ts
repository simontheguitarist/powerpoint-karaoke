import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  participant,
  room,
  round,
  roundSlide,
  slide,
  slideSkipVote,
} from "@/lib/db/schema";
import { publish } from "@/lib/events";
import { newId } from "@/lib/ids";
import { canRoundTransition, type RoundState } from "@/lib/rooms/state-machine";
import { scoreRound, leaderboard } from "@/lib/rooms/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add-round"),
    deckId: z.string(),
    presenterParticipantId: z.string(),
  }),
  z.object({ action: z.literal("start-preview"), roundId: z.string() }),
  z.object({ action: z.literal("lock-preview"), roundId: z.string() }),
  z.object({ action: z.literal("start-presenting"), roundId: z.string() }),
  z.object({ action: z.literal("next-slide"), roundId: z.string() }),
  z.object({ action: z.literal("prev-slide"), roundId: z.string() }),
  z.object({
    action: z.literal("goto-slide"),
    roundId: z.string(),
    slideIndex: z.coerce.number().int().min(0),
  }),
  z.object({ action: z.literal("start-rating"), roundId: z.string() }),
  z.object({ action: z.literal("finish-round"), roundId: z.string() }),
  z.object({ action: z.literal("end-session") }),
]);

async function requireHost(roomId: string) {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user) return { error: "Unauthorized" as const, status: 401 };
  const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
  if (!r) return { error: "Not found" as const, status: 404 };
  if (r.hostUserId !== sess.user.id)
    return { error: "Not the host" as const, status: 403 };
  return { user: sess.user, room: r };
}

async function transitionRound(
  roundId: string,
  to: RoundState
): Promise<{ ok: true } | { error: string; status: number }> {
  const r = await db.query.round.findFirst({ where: eq(round.id, roundId) });
  if (!r) return { error: "Round not found", status: 404 };
  if (!canRoundTransition(r.state as RoundState, to)) {
    return {
      error: `Cannot transition ${r.state} → ${to}`,
      status: 400,
    };
  }
  const patch: Record<string, unknown> = { state: to };
  if (to === "preview" && !r.startedAt) {
    patch.startedAt = new Date();
  }
  if (to === "done") {
    patch.endedAt = new Date();
  }
  db.update(round).set(patch).where(eq(round.id, roundId)).run();
  return { ok: true };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const guard = await requireHost(roomId);
  if ("error" in guard) {
    return Response.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid action", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const action = parsed.data;

  switch (action.action) {
    case "add-round": {
      const exists = await db.query.participant.findFirst({
        where: eq(participant.id, action.presenterParticipantId),
      });
      if (!exists || exists.roomId !== roomId) {
        return Response.json(
          { error: "Presenter not in room" },
          { status: 400 }
        );
      }
      const lastOrder = (
        await db
          .select({ orderIndex: round.orderIndex })
          .from(round)
          .where(eq(round.roomId, roomId))
          .orderBy(asc(round.orderIndex))
      ).at(-1)?.orderIndex;
      const order = (lastOrder ?? -1) + 1;
      const roundId = newId();
      const slides = await db
        .select()
        .from(slide)
        .where(eq(slide.deckId, action.deckId))
        .orderBy(asc(slide.index));
      if (slides.length === 0) {
        return Response.json(
          { error: "Deck has no slides" },
          { status: 400 }
        );
      }
      db.transaction(() => {
        db.insert(round)
          .values({
            id: roundId,
            roomId,
            presenterParticipantId: action.presenterParticipantId,
            deckId: action.deckId,
            orderIndex: order,
            state: "queued",
          })
          .run();
        for (let i = 0; i < slides.length; i++) {
          db.insert(roundSlide)
            .values({
              id: newId(),
              roundId,
              slideId: slides[i].id,
              orderIndex: i,
              skipped: false,
            })
            .run();
        }
      });
      publish(roomId, {
        event: "round-state",
        data: { roundId, state: "queued" },
      });
      return Response.json({ id: roundId });
    }

    case "start-preview": {
      const t = await transitionRound(action.roundId, "preview");
      if ("error" in t)
        return Response.json({ error: t.error }, { status: t.status });
      db.update(room)
        .set({ state: "round", currentRoundId: action.roundId })
        .where(eq(room.id, roomId))
        .run();
      publish(roomId, {
        event: "round-state",
        data: { roundId: action.roundId, state: "preview" },
      });
      publish(roomId, {
        event: "state",
        data: { state: "round", currentRoundId: action.roundId },
      });
      return Response.json({ ok: true });
    }

    case "lock-preview": {
      // Apply skip votes: mark slides where votes >= threshold% of joined judges
      const r = await db.query.room.findFirst({ where: eq(room.id, roomId) });
      if (!r) return Response.json({ error: "Not found" }, { status: 404 });
      const judges = await db
        .select()
        .from(participant)
        .where(eq(participant.roomId, roomId));
      const judgeCount = judges.filter((p) => p.role === "player").length;
      const threshold = Math.max(
        1,
        Math.ceil((judgeCount * r.config.skipThresholdPct) / 100)
      );

      const rsRows = await db
        .select()
        .from(roundSlide)
        .where(eq(roundSlide.roundId, action.roundId));
      const skippedIds: string[] = [];
      for (const rs of rsRows) {
        const voteRows = await db
          .select()
          .from(slideSkipVote)
          .where(eq(slideSkipVote.roundSlideId, rs.id));
        if (voteRows.length >= threshold) {
          db.update(roundSlide)
            .set({ skipped: true })
            .where(eq(roundSlide.id, rs.id))
            .run();
          skippedIds.push(rs.id);
        }
      }
      publish(roomId, {
        event: "slide-locked",
        data: { roundId: action.roundId, skipped: skippedIds, threshold },
      });
      return Response.json({ skipped: skippedIds, threshold });
    }

    case "start-presenting": {
      const t = await transitionRound(action.roundId, "presenting");
      if ("error" in t)
        return Response.json({ error: t.error }, { status: t.status });
      db.update(round)
        .set({ currentSlideIndex: 0 })
        .where(eq(round.id, action.roundId))
        .run();
      publish(roomId, {
        event: "round-state",
        data: { roundId: action.roundId, state: "presenting" },
      });
      publish(roomId, {
        event: "slide-change",
        data: { roundId: action.roundId, slideIndex: 0 },
      });
      return Response.json({ ok: true });
    }

    case "next-slide":
    case "prev-slide":
    case "goto-slide": {
      const r = await db.query.round.findFirst({
        where: eq(round.id, action.roundId),
      });
      if (!r) return Response.json({ error: "Not found" }, { status: 404 });
      const slides = await db
        .select()
        .from(roundSlide)
        .where(eq(roundSlide.roundId, action.roundId))
        .orderBy(asc(roundSlide.orderIndex));
      const active = slides.filter((s) => !s.skipped);
      if (active.length === 0) {
        return Response.json({ error: "No active slides" }, { status: 400 });
      }
      let target = r.currentSlideIndex;
      if (action.action === "next-slide") target = r.currentSlideIndex + 1;
      else if (action.action === "prev-slide")
        target = r.currentSlideIndex - 1;
      else target = action.slideIndex;
      const maxIdx = active.length - 1;
      target = Math.max(0, Math.min(maxIdx, target));
      db.update(round)
        .set({ currentSlideIndex: target })
        .where(eq(round.id, action.roundId))
        .run();
      publish(roomId, {
        event: "slide-change",
        data: { roundId: action.roundId, slideIndex: target },
      });
      return Response.json({ slideIndex: target });
    }

    case "start-rating": {
      const t = await transitionRound(action.roundId, "rating");
      if ("error" in t)
        return Response.json({ error: t.error }, { status: t.status });
      publish(roomId, {
        event: "round-state",
        data: { roundId: action.roundId, state: "rating" },
      });
      return Response.json({ ok: true });
    }

    case "finish-round": {
      const t = await transitionRound(action.roundId, "done");
      if ("error" in t)
        return Response.json({ error: t.error }, { status: t.status });
      const scores = await scoreRound(action.roundId);
      const lb = await leaderboard(roomId);
      db.update(room)
        .set({ state: "leaderboard" })
        .where(eq(room.id, roomId))
        .run();
      publish(roomId, {
        event: "round-state",
        data: { roundId: action.roundId, state: "done" },
      });
      publish(roomId, { event: "results", data: scores });
      publish(roomId, { event: "leaderboard", data: lb });
      publish(roomId, {
        event: "state",
        data: { state: "leaderboard", currentRoundId: action.roundId },
      });
      return Response.json({ scores });
    }

    case "end-session": {
      db.update(room)
        .set({ state: "ended", endedAt: new Date() })
        .where(eq(room.id, roomId))
        .run();
      publish(roomId, {
        event: "state",
        data: { state: "ended" },
      });
      return Response.json({ ok: true });
    }
  }
}

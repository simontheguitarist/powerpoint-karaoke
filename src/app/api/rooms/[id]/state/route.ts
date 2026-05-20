import { headers } from "next/headers";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deck,
  deckVote,
  deckVoteBallot,
  participant,
  room,
  round,
  roundSlide,
  slide,
} from "@/lib/db/schema";
import { publish } from "@/lib/events";
import { newId } from "@/lib/ids";
import { canRoundTransition, type RoundState } from "@/lib/rooms/state-machine";
import { scoreRound, leaderboard } from "@/lib/rooms/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start-round-manual"),
    deckId: z.string(),
    presenterParticipantId: z.string(),
  }),
  z.object({
    action: z.literal("start-round-random"),
    presenterParticipantId: z.string(),
    candidateDeckIds: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("open-deck-vote"),
    presenterParticipantId: z.string(),
    candidateDeckIds: z.array(z.string()).min(2).max(8),
  }),
  z.object({
    action: z.literal("lock-deck-vote"),
    voteId: z.string(),
  }),
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
  if (to === "done") {
    patch.endedAt = new Date();
  }
  db.update(round).set(patch).where(eq(round.id, roundId)).run();
  return { ok: true };
}

async function createRoundForDeck(
  roomId: string,
  presenterParticipantId: string,
  deckId: string
): Promise<{ roundId: string } | { error: string; status: number }> {
  const exists = await db.query.participant.findFirst({
    where: eq(participant.id, presenterParticipantId),
  });
  if (!exists || exists.roomId !== roomId) {
    return { error: "Presenter not in room", status: 400 };
  }
  const d = await db.query.deck.findFirst({ where: eq(deck.id, deckId) });
  if (!d || d.status !== "ready") {
    return { error: "Deck not ready", status: 400 };
  }
  const slides = await db
    .select()
    .from(slide)
    .where(eq(slide.deckId, deckId))
    .orderBy(asc(slide.index));
  if (slides.length === 0) {
    return { error: "Deck has no slides", status: 400 };
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
  db.transaction(() => {
    db.insert(round)
      .values({
        id: roundId,
        roomId,
        presenterParticipantId,
        deckId,
        orderIndex: order,
        state: "presenting",
        startedAt: new Date(),
        currentSlideIndex: 0,
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
    db.update(room)
      .set({
        state: "round",
        currentRoundId: roundId,
        currentDeckVoteId: null,
      })
      .where(eq(room.id, roomId))
      .run();
  });
  publish(roomId, {
    event: "round-state",
    data: { roundId, state: "presenting" },
  });
  publish(roomId, {
    event: "state",
    data: { state: "round", currentRoundId: roundId },
  });
  publish(roomId, {
    event: "slide-change",
    data: { roundId, slideIndex: 0 },
  });
  return { roundId };
}

async function poolForRandom(
  hostUserId: string,
  roomId: string,
  candidates?: string[]
): Promise<string[]> {
  // Decks the host owns + already-used skipped, AND any other ready decks
  // that have been used in this room before (so a 'random' draw can still
  // reach them).
  const owned = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.ownerId, hostUserId), eq(deck.status, "ready")));
  const used = await db
    .select({ id: deck.id })
    .from(round)
    .innerJoin(deck, eq(deck.id, round.deckId))
    .where(eq(round.roomId, roomId));

  const pool = new Set<string>([
    ...owned.map((o) => o.id),
    ...used.map((u) => u.id),
  ]);
  if (candidates && candidates.length > 0) {
    return candidates.filter((c) => pool.has(c));
  }
  return Array.from(pool);
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
    case "start-round-manual": {
      const r = await createRoundForDeck(
        roomId,
        action.presenterParticipantId,
        action.deckId
      );
      if ("error" in r)
        return Response.json({ error: r.error }, { status: r.status });
      return Response.json({ roundId: r.roundId });
    }

    case "start-round-random": {
      const pool = await poolForRandom(
        guard.user.id,
        roomId,
        action.candidateDeckIds
      );
      if (pool.length === 0) {
        return Response.json(
          { error: "No decks available to pick from" },
          { status: 400 }
        );
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const r = await createRoundForDeck(
        roomId,
        action.presenterParticipantId,
        pick
      );
      if ("error" in r)
        return Response.json({ error: r.error }, { status: r.status });
      return Response.json({ roundId: r.roundId, deckId: pick });
    }

    case "open-deck-vote": {
      const exists = await db.query.participant.findFirst({
        where: eq(participant.id, action.presenterParticipantId),
      });
      if (!exists || exists.roomId !== roomId) {
        return Response.json(
          { error: "Presenter not in room" },
          { status: 400 }
        );
      }
      const decks = await db
        .select({ id: deck.id, status: deck.status })
        .from(deck)
        .where(inArray(deck.id, action.candidateDeckIds));
      if (
        decks.length !== action.candidateDeckIds.length ||
        decks.some((d) => d.status !== "ready")
      ) {
        return Response.json(
          { error: "One or more candidate decks aren't ready" },
          { status: 400 }
        );
      }
      const voteId = newId();
      db.transaction(() => {
        db.insert(deckVote)
          .values({
            id: voteId,
            roomId,
            presenterParticipantId: action.presenterParticipantId,
            candidateDeckIds: action.candidateDeckIds,
          })
          .run();
        db.update(room)
          .set({
            state: "deck-vote",
            currentDeckVoteId: voteId,
            currentRoundId: null,
          })
          .where(eq(room.id, roomId))
          .run();
      });
      publish(roomId, {
        event: "state",
        data: { state: "deck-vote", currentDeckVoteId: voteId },
      });
      return Response.json({ voteId });
    }

    case "lock-deck-vote": {
      const v = await db.query.deckVote.findFirst({
        where: eq(deckVote.id, action.voteId),
      });
      if (!v || v.roomId !== roomId)
        return Response.json({ error: "Vote not found" }, { status: 404 });
      if (v.closedAt)
        return Response.json({ error: "Vote already closed" }, { status: 400 });

      const ballots = await db
        .select()
        .from(deckVoteBallot)
        .where(eq(deckVoteBallot.voteId, action.voteId));
      const tally = new Map<string, number>();
      for (const did of v.candidateDeckIds) tally.set(did, 0);
      for (const b of ballots) {
        if (tally.has(b.deckId)) {
          tally.set(b.deckId, (tally.get(b.deckId) ?? 0) + 1);
        }
      }
      let topCount = -1;
      for (const c of tally.values()) topCount = Math.max(topCount, c);
      const leaders = Array.from(tally.entries())
        .filter(([, c]) => c === topCount)
        .map(([d]) => d);
      // If no one voted (topCount===0), still pick at random among candidates.
      const winnerDeckId =
        leaders[Math.floor(Math.random() * leaders.length)] ??
        v.candidateDeckIds[0];

      db.update(deckVote)
        .set({ closedAt: new Date(), winnerDeckId })
        .where(eq(deckVote.id, action.voteId))
        .run();

      const r = await createRoundForDeck(
        roomId,
        v.presenterParticipantId,
        winnerDeckId
      );
      if ("error" in r)
        return Response.json({ error: r.error }, { status: r.status });

      publish(roomId, {
        event: "deck-vote-locked",
        data: {
          voteId: action.voteId,
          winnerDeckId,
          tally: Object.fromEntries(tally),
        },
      });
      return Response.json({ winnerDeckId, roundId: r.roundId, tally: Object.fromEntries(tally) });
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

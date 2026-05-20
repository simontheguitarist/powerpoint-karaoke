import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { participant, rating, round } from "@/lib/db/schema";
import { publish } from "@/lib/events";
import { newId } from "@/lib/ids";
import { getParticipantCookie } from "@/lib/rooms/participant-cookie";
import { rateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;
  const r = await db.query.round.findFirst({ where: eq(round.id, roundId) });
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  if (r.state !== "rating") {
    return Response.json({ error: "Not in rating phase" }, { status: 400 });
  }

  const pid = await getParticipantCookie(r.roomId);
  if (!pid) {
    return Response.json({ error: "Not in room" }, { status: 401 });
  }
  const p = await db.query.participant.findFirst({
    where: eq(participant.id, pid),
  });
  if (!p || p.roomId !== r.roomId) {
    return Response.json({ error: "Not in room" }, { status: 401 });
  }
  if (p.id === r.presenterParticipantId) {
    return Response.json(
      { error: "Presenter can't rate themselves" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid rating", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { criterion, score, comment } = parsed.data;

  const existing = await db.query.rating.findFirst({
    where: and(
      eq(rating.roundId, roundId),
      eq(rating.judgeParticipantId, p.id),
      eq(rating.criterion, criterion)
    ),
  });
  if (existing) {
    db.update(rating)
      .set({ score, comment: comment ?? null })
      .where(eq(rating.id, existing.id))
      .run();
  } else {
    db.insert(rating)
      .values({
        id: newId(),
        roundId,
        judgeParticipantId: p.id,
        criterion,
        score,
        comment: comment ?? null,
      })
      .run();
  }

  const received = await db
    .select()
    .from(rating)
    .where(eq(rating.roundId, roundId));
  const submittedJudges = new Set(received.map((r) => r.judgeParticipantId));
  const judges = await db
    .select()
    .from(participant)
    .where(eq(participant.roomId, r.roomId));
  const totalJudges = judges.filter(
    (j) => j.role === "player" && j.id !== r.presenterParticipantId
  ).length;

  publish(r.roomId, {
    event: "rating-count",
    data: {
      roundId,
      received: submittedJudges.size,
      total: totalJudges,
    },
  });

  return Response.json({
    ok: true,
    received: submittedJudges.size,
    total: totalJudges,
  });
}

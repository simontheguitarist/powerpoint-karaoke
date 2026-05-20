import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deckVote, deckVoteBallot, participant } from "@/lib/db/schema";
import { publish } from "@/lib/events";
import { getParticipantCookie } from "@/lib/rooms/participant-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: voteId } = await params;
  const v = await db.query.deckVote.findFirst({ where: eq(deckVote.id, voteId) });
  if (!v) return Response.json({ error: "Vote not found" }, { status: 404 });
  if (v.closedAt)
    return Response.json({ error: "Vote already closed" }, { status: 410 });

  const pid = await getParticipantCookie(v.roomId);
  if (!pid)
    return Response.json({ error: "Not in room" }, { status: 401 });
  const p = await db.query.participant.findFirst({
    where: eq(participant.id, pid),
  });
  if (!p || p.roomId !== v.roomId)
    return Response.json({ error: "Not in room" }, { status: 401 });
  if (p.role === "host")
    return Response.json({ error: "Hosts don't vote" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const deckId =
    body && typeof body === "object" && typeof body.deckId === "string"
      ? body.deckId
      : null;
  if (!deckId)
    return Response.json({ error: "deckId required" }, { status: 400 });
  if (!v.candidateDeckIds.includes(deckId))
    return Response.json({ error: "Not a candidate" }, { status: 400 });

  // Upsert: delete prior ballot, insert new one.
  db.delete(deckVoteBallot)
    .where(
      and(
        eq(deckVoteBallot.voteId, voteId),
        eq(deckVoteBallot.participantId, p.id)
      )
    )
    .run();
  db.insert(deckVoteBallot)
    .values({ voteId, participantId: p.id, deckId })
    .run();

  // Tally + broadcast.
  const ballots = await db
    .select()
    .from(deckVoteBallot)
    .where(eq(deckVoteBallot.voteId, voteId));
  const tally: Record<string, number> = {};
  for (const c of v.candidateDeckIds) tally[c] = 0;
  for (const b of ballots) {
    if (tally[b.deckId] !== undefined) tally[b.deckId] += 1;
  }

  publish(v.roomId, {
    event: "deck-vote-tally",
    data: { voteId, tally, totalBallots: ballots.length },
  });

  return Response.json({ ok: true, tally });
}

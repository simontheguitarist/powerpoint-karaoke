import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  deck,
  participant,
  room,
  round,
  roundSlide,
  slide,
  slideSkipVote,
} from "@/lib/db/schema";
import { getParticipantCookie } from "@/lib/rooms/participant-cookie";
import { leaderboard } from "@/lib/rooms/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await db.query.room.findFirst({ where: eq(room.id, id) });
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });

  const participants = await db
    .select()
    .from(participant)
    .where(eq(participant.roomId, id))
    .orderBy(asc(participant.joinedAt));

  const rounds = await db
    .select()
    .from(round)
    .where(eq(round.roomId, id))
    .orderBy(asc(round.orderIndex));

  const currentParticipantId = await getParticipantCookie(id);
  const me =
    participants.find((p) => p.id === currentParticipantId) ?? null;

  let currentRound = null as null | {
    id: string;
    state: string;
    orderIndex: number;
    presenterParticipantId: string;
    deck: { id: string; title: string };
    slides: Array<{
      id: string;
      slideId: string;
      orderIndex: number;
      skipped: boolean;
      kind: "image" | "html";
      src: string;
    }>;
    currentSlideIndex: number;
  };
  if (r.currentRoundId) {
    const cr = rounds.find((rr) => rr.id === r.currentRoundId);
    if (cr) {
      const d = await db.query.deck.findFirst({
        where: eq(deck.id, cr.deckId),
      });
      const rs = await db
        .select({
          id: roundSlide.id,
          slideId: roundSlide.slideId,
          orderIndex: roundSlide.orderIndex,
          skipped: roundSlide.skipped,
          kind: slide.kind,
          src: slide.src,
        })
        .from(roundSlide)
        .innerJoin(slide, eq(slide.id, roundSlide.slideId))
        .where(eq(roundSlide.roundId, cr.id))
        .orderBy(asc(roundSlide.orderIndex));
      currentRound = {
        id: cr.id,
        state: cr.state,
        orderIndex: cr.orderIndex,
        presenterParticipantId: cr.presenterParticipantId,
        deck: { id: d?.id ?? "", title: d?.title ?? "" },
        slides: rs,
        currentSlideIndex: cr.currentSlideIndex,
      };
    }
  }

  // Live skip-vote tally for the current round (preview phase resumes after reload)
  const skipVoteTallies: Record<string, number> = {};
  if (currentRound) {
    const rsIds = currentRound.slides.map((s) => s.id);
    if (rsIds.length > 0) {
      for (const s of currentRound.slides) {
        const votes = await db
          .select()
          .from(slideSkipVote)
          .where(eq(slideSkipVote.roundSlideId, s.id));
        if (votes.length > 0) {
          skipVoteTallies[s.slideId] = votes.length;
        }
      }
    }
  }

  // Leaderboard (always include if there's any completed round)
  const completed = rounds.filter((r) => r.state === "done");
  const board = completed.length > 0 ? await leaderboard(id) : [];

  return Response.json({
    room: r,
    participants,
    rounds,
    me,
    currentRound,
    skipVoteTallies,
    leaderboard: board,
  });
}

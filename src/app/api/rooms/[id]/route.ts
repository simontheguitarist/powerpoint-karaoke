import { asc, desc, eq, inArray } from "drizzle-orm";
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
import { getParticipantCookie } from "@/lib/rooms/participant-cookie";
import { leaderboard, scoreRound } from "@/lib/rooms/scoring";

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

  // Active deck vote (if any)
  let currentDeckVote: null | {
    id: string;
    presenterParticipantId: string;
    candidates: Array<{
      id: string;
      title: string;
      description: string | null;
      slideCount: number;
      source: string;
      spiceLevel: string;
    }>;
    tally: Record<string, number>;
    totalBallots: number;
  } = null;
  if (r.currentDeckVoteId) {
    const v = await db.query.deckVote.findFirst({
      where: eq(deckVote.id, r.currentDeckVoteId),
    });
    if (v && !v.closedAt) {
      const cands = v.candidateDeckIds.length
        ? await db
            .select({
              id: deck.id,
              title: deck.title,
              description: deck.description,
              slideCount: deck.slideCount,
              source: deck.source,
              spiceLevel: deck.spiceLevel,
            })
            .from(deck)
            .where(inArray(deck.id, v.candidateDeckIds))
            .orderBy(desc(deck.createdAt))
        : [];
      const ballots = await db
        .select()
        .from(deckVoteBallot)
        .where(eq(deckVoteBallot.voteId, v.id));
      const tally: Record<string, number> = {};
      for (const id of v.candidateDeckIds) tally[id] = 0;
      for (const b of ballots) {
        if (tally[b.deckId] !== undefined) tally[b.deckId] += 1;
      }
      currentDeckVote = {
        id: v.id,
        presenterParticipantId: v.presenterParticipantId,
        candidates: cands,
        tally,
        totalBallots: ballots.length,
      };
    }
  }

  // Last round results (for re-renders during/after the reveal)
  let lastResults = null;
  const lastDoneRound = rounds.filter((rr) => rr.state === "done").at(-1);
  if (lastDoneRound) {
    lastResults = await scoreRound(lastDoneRound.id);
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
    currentDeckVote,
    leaderboard: board,
    lastResults,
  });
}

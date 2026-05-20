import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, participant, rating, round } from "@/lib/db/schema";

export type CriterionScore = {
  criterion: string;
  mean: number;
  count: number;
};

export type RoundComment = {
  from: string;
  text: string;
};

export type RoundScores = {
  roundId: string;
  presenter: { id: string; displayName: string };
  deckTitle: string;
  byCriterion: CriterionScore[];
  overall: number;
  judgeCount: number;
  comments: RoundComment[];
};

export async function scoreRound(roundId: string): Promise<RoundScores> {
  const r = await db.query.round.findFirst({ where: eq(round.id, roundId) });
  if (!r) {
    return {
      roundId,
      presenter: { id: "", displayName: "Presenter" },
      deckTitle: "",
      byCriterion: [],
      overall: 0,
      judgeCount: 0,
      comments: [],
    };
  }

  const [presenter, d, ratings] = await Promise.all([
    db.query.participant.findFirst({
      where: eq(participant.id, r.presenterParticipantId),
    }),
    db.query.deck.findFirst({ where: eq(deck.id, r.deckId) }),
    db.select().from(rating).where(eq(rating.roundId, roundId)),
  ]);

  // Lookup judge names for comment attribution
  const judgeIds = Array.from(
    new Set(ratings.map((r) => r.judgeParticipantId))
  );
  const judges = judgeIds.length
    ? await db
        .select()
        .from(participant)
        .where(inArray(participant.id, judgeIds))
    : [];
  const judgeName = new Map(judges.map((j) => [j.id, j.displayName]));

  const byC = new Map<string, { sum: number; n: number }>();
  const submitted = new Set<string>();
  for (const row of ratings) {
    submitted.add(row.judgeParticipantId);
    const c = byC.get(row.criterion) ?? { sum: 0, n: 0 };
    c.sum += row.score;
    c.n += 1;
    byC.set(row.criterion, c);
  }
  const byCriterion = Array.from(byC.entries()).map(([criterion, v]) => ({
    criterion,
    mean: v.n > 0 ? v.sum / v.n : 0,
    count: v.n,
  }));
  const overall =
    byCriterion.length > 0
      ? byCriterion.reduce((s, c) => s + c.mean, 0) / byCriterion.length
      : 0;

  // De-duplicate comments per judge so a judge submitting the same text on
  // every criterion only shows up once.
  const commentMap = new Map<string, RoundComment>();
  for (const row of ratings) {
    if (!row.comment) continue;
    const text = row.comment.trim();
    if (!text) continue;
    const key = `${row.judgeParticipantId}::${text}`;
    if (!commentMap.has(key)) {
      commentMap.set(key, {
        from: judgeName.get(row.judgeParticipantId) ?? "Anonymous",
        text,
      });
    }
  }

  return {
    roundId,
    presenter: {
      id: r.presenterParticipantId,
      displayName:
        presenter?.displayName ?? "Presenter",
    },
    deckTitle: d?.title ?? "",
    byCriterion,
    overall,
    judgeCount: submitted.size,
    comments: Array.from(commentMap.values()),
  };
}

export type LeaderboardEntry = {
  participantId: string;
  displayName: string;
  rounds: number;
  overall: number;
  byCriterion: Record<string, number>;
  comments: RoundComment[];
};

export async function leaderboard(roomId: string): Promise<LeaderboardEntry[]> {
  const rounds = await db
    .select()
    .from(round)
    .where(eq(round.roomId, roomId));

  if (rounds.length === 0) return [];

  const presenters = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.roomId, roomId),
        inArray(
          participant.id,
          rounds.map((r) => r.presenterParticipantId)
        )
      )
    );
  const nameById = new Map(presenters.map((p) => [p.id, p.displayName]));

  const allRatings = await db
    .select()
    .from(rating)
    .where(
      inArray(
        rating.roundId,
        rounds.map((r) => r.id)
      )
    );

  // Look up judge names for the leaderboard comments view.
  const judgeIds = Array.from(
    new Set(allRatings.map((r) => r.judgeParticipantId))
  );
  const judges = judgeIds.length
    ? await db
        .select()
        .from(participant)
        .where(inArray(participant.id, judgeIds))
    : [];
  const judgeName = new Map(judges.map((j) => [j.id, j.displayName]));

  const ratingsByRound = new Map<string, typeof allRatings>();
  for (const r of allRatings) {
    const arr = ratingsByRound.get(r.roundId) ?? [];
    arr.push(r);
    ratingsByRound.set(r.roundId, arr);
  }

  const byPresenter = new Map<
    string,
    {
      displayName: string;
      rounds: number;
      criterionSums: Record<string, { sum: number; n: number }>;
      comments: Map<string, RoundComment>;
    }
  >();

  for (const r of rounds) {
    const ratings = ratingsByRound.get(r.id) ?? [];
    if (ratings.length === 0) continue;
    const slot = byPresenter.get(r.presenterParticipantId) ?? {
      displayName: nameById.get(r.presenterParticipantId) ?? "Presenter",
      rounds: 0,
      criterionSums: {},
      comments: new Map<string, RoundComment>(),
    };
    slot.rounds += 1;
    for (const row of ratings) {
      const c = slot.criterionSums[row.criterion] ?? { sum: 0, n: 0 };
      c.sum += row.score;
      c.n += 1;
      slot.criterionSums[row.criterion] = c;

      if (row.comment) {
        const text = row.comment.trim();
        if (!text) continue;
        const key = `${row.judgeParticipantId}::${text}`;
        if (!slot.comments.has(key)) {
          slot.comments.set(key, {
            from: judgeName.get(row.judgeParticipantId) ?? "Anonymous",
            text,
          });
        }
      }
    }
    byPresenter.set(r.presenterParticipantId, slot);
  }

  const result: LeaderboardEntry[] = [];
  for (const [participantId, slot] of byPresenter) {
    const byCriterion: Record<string, number> = {};
    let overallSum = 0;
    let overallN = 0;
    for (const [c, v] of Object.entries(slot.criterionSums)) {
      const mean = v.n > 0 ? v.sum / v.n : 0;
      byCriterion[c] = mean;
      overallSum += mean;
      overallN += 1;
    }
    result.push({
      participantId,
      displayName: slot.displayName,
      rounds: slot.rounds,
      overall: overallN > 0 ? overallSum / overallN : 0,
      byCriterion,
      comments: Array.from(slot.comments.values()),
    });
  }
  result.sort((a, b) => b.overall - a.overall);
  return result;
}

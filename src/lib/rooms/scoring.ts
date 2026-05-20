import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { participant, rating, round } from "@/lib/db/schema";

export type CriterionScore = {
  criterion: string;
  mean: number;
  count: number;
};

export type RoundScores = {
  roundId: string;
  byCriterion: CriterionScore[];
  overall: number;
  judgeCount: number;
};

export async function scoreRound(roundId: string): Promise<RoundScores> {
  const rows = await db
    .select()
    .from(rating)
    .where(eq(rating.roundId, roundId));

  const byC = new Map<string, { sum: number; n: number }>();
  const judges = new Set<string>();
  for (const r of rows) {
    judges.add(r.judgeParticipantId);
    const c = byC.get(r.criterion) ?? { sum: 0, n: 0 };
    c.sum += r.score;
    c.n += 1;
    byC.set(r.criterion, c);
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
  return {
    roundId,
    byCriterion,
    overall,
    judgeCount: judges.size,
  };
}

export type LeaderboardEntry = {
  participantId: string;
  displayName: string;
  rounds: number;
  overall: number;
  byCriterion: Record<string, number>;
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
    }
  >();

  for (const r of rounds) {
    const ratings = ratingsByRound.get(r.id) ?? [];
    if (ratings.length === 0) continue;
    const slot = byPresenter.get(r.presenterParticipantId) ?? {
      displayName: nameById.get(r.presenterParticipantId) ?? "Presenter",
      rounds: 0,
      criterionSums: {},
    };
    slot.rounds += 1;
    for (const rating of ratings) {
      const c = slot.criterionSums[rating.criterion] ?? { sum: 0, n: 0 };
      c.sum += rating.score;
      c.n += 1;
      slot.criterionSums[rating.criterion] = c;
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
    });
  }
  result.sort((a, b) => b.overall - a.overall);
  return result;
}

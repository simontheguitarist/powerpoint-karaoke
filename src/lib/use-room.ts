"use client";
import { useEffect, useRef, useState } from "react";

export type RoundComment = { from: string; text: string };

export type RoundResults = {
  roundId: string;
  presenter: { id: string; displayName: string };
  deckTitle: string;
  byCriterion: Array<{ criterion: string; mean: number; count: number }>;
  overall: number;
  judgeCount: number;
  comments: RoundComment[];
};

export type LeaderboardRow = {
  participantId: string;
  displayName: string;
  overall: number;
  rounds: number;
  byCriterion: Record<string, number>;
  comments: RoundComment[];
};

export type RoomData = {
  room: {
    id: string;
    code: string;
    state: "lobby" | "round" | "leaderboard" | "ended";
    currentRoundId: string | null;
    hostUserId: string;
    config: {
      maxRoundSeconds: number;
      previewSeconds: number;
      skipThresholdPct: number;
      rubric: string[];
    };
  };
  participants: Array<{
    id: string;
    displayName: string;
    role: "host" | "player";
    userId: string | null;
  }>;
  rounds: Array<{
    id: string;
    orderIndex: number;
    state: "queued" | "preview" | "presenting" | "rating" | "done";
    presenterParticipantId: string;
    deckId: string;
    currentSlideIndex: number;
  }>;
  me: {
    id: string;
    displayName: string;
    role: "host" | "player";
  } | null;
  currentRound: {
    id: string;
    state: string;
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
  } | null;
  skipVoteTallies?: Record<string, number>;
  leaderboard?: LeaderboardRow[];
  lastResults?: RoundResults | null;
  currentDeckVote?: {
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
  } | null;
};

export function useRoom(roomId: string | null) {
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipVotes, setSkipVotes] = useState<Record<string, number>>({});
  const [ratingProgress, setRatingProgress] = useState<{
    received: number;
    total: number;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [results, setResults] = useState<RoundResults | null>(null);
  const evtRef = useRef<EventSource | null>(null);

  const fetchState = async () => {
    if (!roomId) return;
    const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as RoomData;
      setData(j);
      if (j.skipVoteTallies) {
        setSkipVotes((prev) => ({ ...prev, ...j.skipVoteTallies }));
      }
      if (j.leaderboard && j.leaderboard.length > 0) {
        setLeaderboard(j.leaderboard);
      }
      if (j.lastResults) {
        setResults(j.lastResults);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    fetchState();
    const es = new EventSource(`/api/rooms/${roomId}/events`);
    evtRef.current = es;

    es.addEventListener("state", () => fetchState());
    es.addEventListener("round-state", () => fetchState());
    es.addEventListener("slide-change", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setData((prev) =>
        prev && prev.currentRound && prev.currentRound.id === d.roundId
          ? {
              ...prev,
              currentRound: {
                ...prev.currentRound,
                currentSlideIndex: d.slideIndex,
              },
            }
          : prev
      );
    });
    es.addEventListener("preview-vote", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setSkipVotes((prev) => ({ ...prev, [d.slideId]: d.totalVotes }));
    });
    es.addEventListener("slide-locked", () => fetchState());
    es.addEventListener("rating-count", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setRatingProgress({ received: d.received, total: d.total });
    });
    es.addEventListener("results", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as RoundResults;
        setResults(d);
      } catch {
        /* */
      }
      fetchState();
    });
    es.addEventListener("deck-vote-tally", () => fetchState());
    es.addEventListener("deck-vote-locked", () => fetchState());
    es.addEventListener("leaderboard", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as LeaderboardRow[];
        setLeaderboard(d);
      } catch {
        /* */
      }
    });
    es.addEventListener("participant", () => fetchState());

    es.onerror = () => {
      // EventSource auto-reconnects on its own.
    };

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return {
    data,
    loading,
    skipVotes,
    ratingProgress,
    leaderboard,
    results,
    refetch: fetchState,
  };
}

export type RoundState = "presenting" | "rating" | "done";

export const ROUND_TRANSITIONS: Record<RoundState, RoundState[]> = {
  presenting: ["rating", "done"],
  rating: ["done"],
  done: [],
};

export function canRoundTransition(from: RoundState, to: RoundState): boolean {
  return ROUND_TRANSITIONS[from].includes(to);
}

export type RoomState =
  | "lobby"
  | "deck-vote"
  | "round"
  | "leaderboard"
  | "ended";

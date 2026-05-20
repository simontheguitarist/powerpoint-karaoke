export type RoundState =
  | "queued"
  | "preview"
  | "presenting"
  | "rating"
  | "done";

export const ROUND_TRANSITIONS: Record<RoundState, RoundState[]> = {
  queued: ["preview", "done"],
  preview: ["presenting", "done"],
  presenting: ["rating", "done"],
  rating: ["done"],
  done: [],
};

export function canRoundTransition(from: RoundState, to: RoundState): boolean {
  return ROUND_TRANSITIONS[from].includes(to);
}

export type RoomState = "lobby" | "round" | "leaderboard" | "ended";

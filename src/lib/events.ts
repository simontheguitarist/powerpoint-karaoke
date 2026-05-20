/**
 * Per-room SSE fan-out registry.
 *
 * The browser EventSource API auto-reconnects on disconnect, so the source
 * of truth is the database — this is just the live-push channel.
 */

type Writer = (chunk: string) => void;

const rooms = new Map<string, Set<Writer>>();

export type RoomEvent =
  | { event: "state"; data: unknown }
  | { event: "round-state"; data: unknown }
  | { event: "preview-vote"; data: unknown }
  | { event: "slide-locked"; data: unknown }
  | { event: "slide-change"; data: unknown }
  | { event: "round-timer"; data: unknown }
  | { event: "rating-count"; data: unknown }
  | { event: "results"; data: unknown }
  | { event: "leaderboard"; data: unknown }
  | { event: "participant"; data: unknown }
  | { event: "ping"; data: unknown };

export function subscribe(roomId: string, write: Writer): () => void {
  let set = rooms.get(roomId);
  if (!set) {
    set = new Set();
    rooms.set(roomId, set);
  }
  set.add(write);
  return () => {
    set!.delete(write);
    if (set!.size === 0) rooms.delete(roomId);
  };
}

export function publish(roomId: string, ev: RoomEvent) {
  const set = rooms.get(roomId);
  if (!set || set.size === 0) return;
  const chunk = `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`;
  for (const write of set) {
    try {
      write(chunk);
    } catch {
      set.delete(write);
    }
  }
}

export function subscriberCount(roomId: string): number {
  return rooms.get(roomId)?.size ?? 0;
}

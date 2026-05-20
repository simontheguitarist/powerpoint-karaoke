"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Deck } from "@/lib/db/schema";

type Mode = "pick" | "random" | "vote";

export function SetupCard({
  roomId,
  myDecks,
  players,
  busy,
  onAction,
  initialDeckId,
}: {
  roomId: string;
  myDecks: Deck[];
  players: Array<{ id: string; displayName: string; role: "host" | "player" }>;
  busy: boolean;
  onAction: (body: object) => Promise<unknown>;
  initialDeckId?: string | null;
}) {
  const readyDecks = myDecks.filter((d) => d.status === "ready");
  const [presenter, setPresenter] = useState("");
  const [mode, setMode] = useState<Mode>("pick");
  const [deckId, setDeckId] = useState("");
  const [voteSize, setVoteSize] = useState(3);

  useEffect(() => {
    if (presenter || players.length === 0) return;
    setPresenter(players[0].id);
  }, [players, presenter]);

  // Preselect the deck passed in via URL (?deck=...) if it's in this user's
  // ready set. Otherwise fall back to the first ready deck.
  useEffect(() => {
    if (deckId) return;
    if (readyDecks.length === 0) return;
    if (initialDeckId && readyDecks.some((d) => d.id === initialDeckId)) {
      setDeckId(initialDeckId);
    } else {
      setDeckId(readyDecks[0].id);
    }
  }, [readyDecks, deckId, initialDeckId]);

  const start = async () => {
    if (!presenter) return;
    if (mode === "pick") {
      if (!deckId) return;
      await onAction({
        action: "start-round-manual",
        deckId,
        presenterParticipantId: presenter,
      });
    } else if (mode === "random") {
      await onAction({
        action: "start-round-random",
        presenterParticipantId: presenter,
        candidateDeckIds: readyDecks.map((d) => d.id),
      });
    } else {
      const pool = [...readyDecks].sort(() => Math.random() - 0.5);
      const picks = pool.slice(0, Math.min(voteSize, pool.length));
      if (picks.length < 2) {
        alert("Need at least 2 ready decks to open a vote.");
        return;
      }
      await onAction({
        action: "open-deck-vote",
        presenterParticipantId: presenter,
        candidateDeckIds: picks.map((d) => d.id),
      });
    }
  };

  const sortedPlayers = [...players].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  return (
    <div className="card p-7 max-w-2xl mx-auto">
      <div className="text-xs uppercase tracking-[0.25em] text-mute mb-1">
        Set up the next round
      </div>
      <h3 className="display text-3xl">Who&apos;s up?</h3>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Presenter
          </label>
          <select
            value={presenter}
            onChange={(e) => setPresenter(e.target.value)}
            className="input mt-1.5"
          >
            <option value="">Pick a presenter…</option>
            {sortedPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
            {sortedPlayers.length === 0 && (
              <option disabled value="">
                Waiting for players to join…
              </option>
            )}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Deck
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(
              [
                { value: "pick", label: "Host picks" },
                { value: "random", label: "Random" },
                { value: "vote", label: "Group vote" },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`text-xs px-3 py-2.5 rounded-xl border transition ${
                  mode === m.value
                    ? "bg-ink text-canvas border-ink"
                    : "hover:bg-canvas-2"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {mode === "pick" && (
          <div>
            <label className="text-xs uppercase tracking-widest text-mute">
              Which deck?
            </label>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="input mt-1.5"
            >
              {readyDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {d.slideCount}sl · {d.spiceLevel}
                </option>
              ))}
              {readyDecks.length === 0 && (
                <option disabled value="">
                  No decks yet
                </option>
              )}
            </select>
          </div>
        )}

        {mode === "random" && (
          <p className="text-sm text-mute">
            We&apos;ll pick a random deck from your{" "}
            <strong>{readyDecks.length}</strong>{" "}
            ready deck{readyDecks.length === 1 ? "" : "s"}.
          </p>
        )}

        {mode === "vote" && (
          <div>
            <label className="text-xs uppercase tracking-widest text-mute">
              How many candidates? ({voteSize})
            </label>
            <input
              type="range"
              min={2}
              max={Math.min(6, Math.max(2, readyDecks.length))}
              value={voteSize}
              onChange={(e) => setVoteSize(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-flame"
            />
            <p className="text-xs text-mute mt-2">
              We&apos;ll pick {voteSize} decks at random and let the room vote
              from their phones.
            </p>
          </div>
        )}
      </div>

      {readyDecks.length === 0 && (
        <p className="text-xs text-chili mt-4">
          You have no decks yet.{" "}
          <Link href="/library" className="underline">
            Browse the library
          </Link>{" "}
          or{" "}
          <Link href="/studio/upload" className="underline">
            upload one
          </Link>
          .
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          disabled={busy || !presenter || readyDecks.length === 0}
          onClick={start}
          className="btn btn-flame disabled:opacity-40"
        >
          {mode === "vote" ? "Open the vote" : "Start round"}
        </button>
        <span className="text-xs text-mute font-mono">
          room {roomId.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SlideStage } from "@/components/SlideStage";
import { QRCode } from "@/components/QRCode";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { useRoom } from "@/lib/use-room";
import type { Deck } from "@/lib/db/schema";

export function HostPanel({
  roomId,
  myDecks,
}: {
  roomId: string;
  myDecks: Deck[];
}) {
  const { data, loading, skipVotes, ratingProgress, leaderboard } =
    useRoom(roomId);
  const [busy, setBusy] = useState(false);

  const currentRound = data?.currentRound ?? null;
  const players = useMemo(
    () => (data?.participants ?? []).filter((p) => p.role === "player"),
    [data]
  );

  const post = async (body: object) => {
    setBusy(true);
    const res = await fetch(`/api/rooms/${roomId}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? `Action failed (${res.status})`);
    }
  };

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-mute">Loading room…</div>
      </div>
    );
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/r/${data.room.code}`
      : `/play/r/${data.room.code}`;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 card p-6 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-mute">
              Room code
            </div>
            <div className="display text-6xl md:text-7xl tracking-[0.15em] font-mono mt-1">
              {data.room.code}
            </div>
            <div className="text-xs text-mute mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono truncate">{joinUrl}</span>
              <CopyLinkButton text={joinUrl} />
              <Link
                href={`/play/projector/${roomId}`}
                target="_blank"
                className="btn btn-primary text-xs px-3 py-2"
              >
                Open projector ↗
              </Link>
            </div>
          </div>
          <div className="hidden sm:block shrink-0">
            <QRCode text={joinUrl} size={120} />
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs uppercase tracking-widest text-mute mb-3">
            In the room · {players.length}
          </div>
          <ul className="space-y-1.5 text-sm max-h-40 overflow-auto">
            {players.length === 0 && (
              <li className="text-mute italic">Waiting for players…</li>
            )}
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-mint" />
                {p.displayName}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Round controls */}
      {currentRound ? (
        <CurrentRoundPanel
          roomId={roomId}
          round={currentRound}
          rounds={data.rounds}
          players={players}
          skipVotes={skipVotes}
          ratingProgress={ratingProgress}
          post={post}
          busy={busy}
        />
      ) : (
        <NoRoundPanel
          roomId={roomId}
          myDecks={myDecks}
          players={players}
          rounds={data.rounds}
          post={post}
          busy={busy}
        />
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl mb-4">Running leaderboard</h2>
          <div className="card p-5">
            <ul className="divide-y">
              {leaderboard.map((row, i) => (
                <li
                  key={row.participantId}
                  className="flex items-center justify-between py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="display text-2xl w-8 text-mute">
                      {i + 1}
                    </span>
                    <span>{row.displayName}</span>
                  </span>
                  <span className="font-mono">
                    {row.overall.toFixed(2)}
                    <span className="text-mute text-xs ml-2">
                      ({row.rounds} round{row.rounds === 1 ? "" : "s"})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="mt-10 text-right">
        <button
          onClick={() => {
            if (confirm("End the session for everyone?")) {
              post({ action: "end-session" });
            }
          }}
          className="text-sm text-chili hover:underline"
        >
          End session
        </button>
      </div>
    </div>
  );
}

function NoRoundPanel({
  roomId,
  myDecks,
  players,
  rounds,
  post,
  busy,
}: {
  roomId: string;
  myDecks: Deck[];
  players: Array<{ id: string; displayName: string }>;
  rounds: Array<{ id: string; state: string; deckId: string; presenterParticipantId: string }>;
  post: (b: object) => void;
  busy: boolean;
}) {
  const [presenter, setPresenter] = useState("");
  const [deckId, setDeckId] = useState("");
  const queued = rounds.filter((r) => r.state === "queued");
  const readyDecks = myDecks.filter((d) => d.status === "ready");

  return (
    <section className="card p-8">
      <h2 className="display text-3xl">Set up the next round.</h2>
      <p className="text-mute mt-2 text-sm">
        Pick a presenter from the room, and a deck. The presenter won&apos;t
        see the slides during preview.
      </p>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Presenter
          </label>
          <select
            value={presenter}
            onChange={(e) => setPresenter(e.target.value)}
            className="input mt-1.5"
          >
            <option value="">Pick a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Deck
          </label>
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="input mt-1.5"
          >
            <option value="">Pick a deck…</option>
            {readyDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.slideCount}sl · {d.spiceLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={busy || !presenter || !deckId}
          onClick={async () => {
            const res = await fetch(`/api/rooms/${roomId}/state`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "add-round",
                deckId,
                presenterParticipantId: presenter,
              }),
            });
            if (!res.ok) {
              alert("Couldn't queue round.");
              return;
            }
            const { id } = await res.json();
            post({ action: "start-preview", roundId: id });
            setPresenter("");
            setDeckId("");
          }}
          className="btn btn-flame disabled:opacity-40"
        >
          Start round
        </button>
        {queued.length > 0 && (
          <button
            disabled={busy}
            onClick={() => post({ action: "start-preview", roundId: queued[0].id })}
            className="btn btn-primary"
          >
            Start queued round
          </button>
        )}
      </div>

      {readyDecks.length === 0 && (
        <p className="text-sm text-chili mt-4">
          You don&apos;t have any decks yet.{" "}
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
      {players.length === 0 && (
        <p className="text-sm text-mute mt-4">
          Waiting for players to join with code{" "}
          <span className="font-mono uppercase">…</span>
        </p>
      )}
    </section>
  );
}

function CurrentRoundPanel({
  roomId,
  round,
  rounds,
  players,
  skipVotes,
  ratingProgress,
  post,
  busy,
}: {
  roomId: string;
  round: NonNullable<ReturnType<typeof useRoom>["data"]>["currentRound"];
  rounds: Array<{ id: string; state: string; presenterParticipantId: string; deckId: string }>;
  players: Array<{ id: string; displayName: string }>;
  skipVotes: Record<string, number>;
  ratingProgress: { received: number; total: number } | null;
  post: (b: object) => Promise<void> | void;
  busy: boolean;
}) {
  if (!round) return null;
  const presenter = players.find((p) => p.id === round.presenterParticipantId);
  const activeSlides = round.slides.filter((s) => !s.skipped);
  const currentSlide = activeSlides[round.currentSlideIndex];

  return (
    <section className="space-y-6">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-mute">
            Now presenting · round {round.id.slice(0, 6)}
          </div>
          <div className="display text-3xl mt-1">
            {presenter?.displayName ?? "—"}{" "}
            <span className="text-mute text-base">on</span>{" "}
            <span>&quot;{round.deck.title}&quot;</span>
          </div>
        </div>
        <span className="pill bg-flame text-white border-flame">
          {round.state}
        </span>
      </div>

      {round.state === "preview" && (
        <div className="card p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="display text-2xl">Audience preview</h3>
            <div className="text-sm text-mute">
              {round.slides.length} slides · vote to cut
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {round.slides.map((rs) => {
              const votes = skipVotes[rs.slideId] ?? 0;
              return (
                <div
                  key={rs.id}
                  className={`relative aspect-video rounded-xl border overflow-hidden ${
                    rs.skipped ? "opacity-30" : "bg-canvas-2"
                  }`}
                >
                  <SlideInline
                    src={rs.src}
                    kind={rs.kind}
                    deckId={round.deck.id}
                  />
                  <div className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-mono">
                    {String(rs.orderIndex + 1).padStart(2, "0")}
                  </div>
                  {votes > 0 && (
                    <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full bg-flame text-white text-[10px] font-mono">
                      skip {votes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={async () => {
                await post({ action: "lock-preview", roundId: round.id });
                await post({ action: "start-presenting", roundId: round.id });
              }}
              className="btn btn-flame"
            >
              Lock in &amp; start presenting
            </button>
            <PreviewTimer seconds={30} />
          </div>
        </div>
      )}

      {round.state === "presenting" && currentSlide && (
        <div className="card p-6">
          <div className="aspect-video w-full max-h-[60vh] mb-4 rounded-xl overflow-hidden">
            <SlideStage
              deckId={round.deck.id}
              src={currentSlide.src}
              kind={currentSlide.kind}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                disabled={busy || round.currentSlideIndex === 0}
                onClick={() => post({ action: "prev-slide", roundId: round.id })}
                className="btn btn-ghost"
              >
                ← Prev
              </button>
              <button
                disabled={
                  busy || round.currentSlideIndex >= activeSlides.length - 1
                }
                onClick={() => post({ action: "next-slide", roundId: round.id })}
                className="btn btn-primary"
              >
                Next →
              </button>
              <span className="text-sm text-mute ml-2 font-mono">
                {round.currentSlideIndex + 1} / {activeSlides.length}
              </span>
            </div>
            <button
              disabled={busy}
              onClick={() => post({ action: "start-rating", roundId: round.id })}
              className="btn btn-flame"
            >
              End presentation → rate
            </button>
          </div>
        </div>
      )}

      {round.state === "rating" && (
        <div className="card p-6 text-center">
          <h3 className="display text-3xl">Judges are scoring.</h3>
          {ratingProgress && (
            <div className="mt-4">
              <div className="display text-5xl">
                {ratingProgress.received}{" "}
                <span className="text-mute">/ {ratingProgress.total}</span>
              </div>
              <div className="text-xs uppercase tracking-widest text-mute mt-2">
                rubrics submitted
              </div>
              <div className="mt-4 h-2 rounded-full bg-canvas-2 overflow-hidden max-w-md mx-auto">
                <div
                  className="h-full bg-flame transition-all"
                  style={{
                    width: `${
                      ratingProgress.total > 0
                        ? (ratingProgress.received / ratingProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
          <button
            disabled={busy}
            onClick={() => post({ action: "finish-round", roundId: round.id })}
            className="btn btn-flame mt-6"
          >
            Reveal results
          </button>
        </div>
      )}

      {round.state === "done" && (
        <div className="card p-6 text-center">
          <h3 className="display text-3xl">Round complete.</h3>
          <p className="text-mute mt-2">Check the leaderboard below.</p>
        </div>
      )}
    </section>
  );
}

function SlideInline({
  deckId,
  src,
  kind,
}: {
  deckId: string;
  src: string;
  kind: "image" | "html";
}) {
  const url = `/api/decks/${deckId}/file/${src.replace(/^decks\/[^/]+\//, "")}`;
  return kind === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
  ) : (
    <div className="absolute inset-0 overflow-hidden">
      <iframe
        src={url}
        sandbox="allow-same-origin"
        loading="lazy"
        className="absolute origin-top-left pointer-events-none"
        style={{
          width: 1280,
          height: 720,
          transform: "scale(0.16)",
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

function PreviewTimer({ seconds }: { seconds: number }) {
  const [remain, setRemain] = useState(seconds);
  useEffect(() => {
    if (remain <= 0) return;
    const t = setTimeout(() => setRemain((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remain]);
  return (
    <div className="font-mono text-sm text-mute self-center">
      Suggested preview: {remain}s
    </div>
  );
}

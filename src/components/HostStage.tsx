"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoom } from "@/lib/use-room";
import type { Deck } from "@/lib/db/schema";
import { SlideStage } from "@/components/SlideStage";
import { SlideRender } from "@/components/SlideRender";
import { QRCode } from "@/components/QRCode";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { SetupCard } from "@/components/SetupCard";
import { DeckVoteStage } from "@/components/DeckVoteStage";
import { ResultsReveal } from "@/components/ResultsReveal";
import { RichLeaderboard } from "@/components/RichLeaderboard";

export function HostStage({
  roomId,
  myDecks,
}: {
  roomId: string;
  myDecks: Deck[];
}) {
  const { data, loading, skipVotes, ratingProgress, leaderboard, results } =
    useRoom(roomId);
  const searchParams = useSearchParams();
  const initialDeckId = searchParams.get("deck");
  const [busy, setBusy] = useState(false);
  const [hideControls, setHideControls] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedRoundId, setRevealedRoundId] = useState<string | null>(null);

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
    return res;
  };

  const round = data?.currentRound ?? null;
  const presenter =
    round &&
    data?.participants.find((p) => p.id === round.presenterParticipantId);
  const activeSlides = round?.slides.filter((s) => !s.skipped) ?? [];
  const currentSlide = round ? activeSlides[round.currentSlideIndex] : null;
  // Host is the MC, never counted as a player. Filter them out everywhere
  // the UI reads "people in the room" / "who's presenting".
  const players = useMemo(
    () => (data?.participants ?? []).filter((p) => p.role === "player"),
    [data?.participants]
  );

  // Trigger the reveal animation when a new round becomes done
  useEffect(() => {
    if (!results) return;
    if (results.roundId === revealedRoundId) return;
    setRevealedRoundId(results.roundId);
    setShowReveal(true);
  }, [results, revealedRoundId]);

  // Auto-hide controls during presenting if mouse idle
  useEffect(() => {
    if (round?.state !== "presenting") {
      setHideControls(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setHideControls(false);
      clearTimeout(timer);
      timer = setTimeout(() => setHideControls(true), 2500);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [round?.state]);

  // Keyboard nav while presenting
  useEffect(() => {
    if (round?.state !== "presenting") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        post({ action: "next-slide", roundId: round.id });
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        post({ action: "prev-slide", roundId: round.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, round?.state]);

  if (loading || !data) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="opacity-50">Loading room…</div>
      </div>
    );
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/r/${data.room.code}`
      : `/play/r/${data.room.code}`;

  const roomState = data.room.state;

  // Reveal overlay takes priority once it's triggered, until user dismisses
  if (showReveal && results) {
    return (
      <div className="absolute inset-0 flex flex-col bg-black text-white">
        <TopBar
          code={data.room.code}
          joinUrl={joinUrl}
          onEnd={() => {
            if (confirm("End the session for everyone?")) {
              post({ action: "end-session" });
            }
          }}
          dimmed={false}
        />
        <ResultsReveal results={results} onDone={() => setShowReveal(false)} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-black text-white">
      <TopBar
        code={data.room.code}
        joinUrl={joinUrl}
        onEnd={() => {
          if (confirm("End the session for everyone?")) {
            post({ action: "end-session" });
          }
        }}
        dimmed={round?.state === "presenting" && hideControls}
      />

      {/* LOBBY */}
      {roomState === "lobby" && !round && (
        <LobbyView
          code={data.room.code}
          joinUrl={joinUrl}
          players={players}
          roomId={roomId}
          myDecks={myDecks}
          busy={busy}
          post={post}
          initialDeckId={initialDeckId}
        />
      )}

      {/* DECK VOTE */}
      {roomState === "deck-vote" && data.currentDeckVote && (
        <DeckVoteStage
          presenterName={
            data.participants.find(
              (p) => p.id === data.currentDeckVote!.presenterParticipantId
            )?.displayName ?? "Presenter"
          }
          candidates={data.currentDeckVote.candidates}
          tally={data.currentDeckVote.tally}
          totalBallots={data.currentDeckVote.totalBallots}
          totalVoters={
            players.filter(
              (p) => p.id !== data.currentDeckVote!.presenterParticipantId
            ).length
          }
          isHost
          busy={busy}
          onLock={() =>
            post({ action: "lock-deck-vote", voteId: data.currentDeckVote!.id })
          }
        />
      )}

      {/* PREVIEW */}
      {round && round.state === "preview" && (
        <PreviewView
          round={round}
          presenter={presenter?.displayName ?? "Presenter"}
          skipVotes={skipVotes}
          busy={busy}
          onLockAndStart={async () => {
            await post({ action: "lock-preview", roundId: round.id });
            await post({ action: "start-presenting", roundId: round.id });
          }}
        />
      )}

      {/* PRESENTING */}
      {round && round.state === "presenting" && currentSlide && (
        <>
          <div className="absolute inset-0">
            <SlideStage
              deckId={round.deck.id}
              src={currentSlide.src}
              kind={currentSlide.kind}
              fit="contain"
            />
          </div>
          <PresentingControls
            current={round.currentSlideIndex}
            total={activeSlides.length}
            busy={busy}
            hidden={hideControls}
            onPrev={() => post({ action: "prev-slide", roundId: round.id })}
            onNext={() => post({ action: "next-slide", roundId: round.id })}
            onEnd={() => post({ action: "start-rating", roundId: round.id })}
          />
        </>
      )}

      {/* RATING */}
      {round && round.state === "rating" && (
        <RatingView
          presenter={presenter?.displayName ?? "Presenter"}
          ratingProgress={ratingProgress}
          busy={busy}
          onReveal={() => post({ action: "finish-round", roundId: round.id })}
        />
      )}

      {/* LEADERBOARD */}
      {roomState === "leaderboard" && !showReveal && (
        <LeaderboardView
          leaderboard={leaderboard ?? []}
          highlightId={results?.presenter.id ?? null}
          roomId={roomId}
          myDecks={myDecks}
          players={players}
          busy={busy}
          post={post}
          replayReveal={() => results && setShowReveal(true)}
        />
      )}

      {/* ENDED */}
      {roomState === "ended" && (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="display text-9xl">Curtain.</div>
            <div className="mt-6 opacity-60">Session ended.</div>
            <Link href="/play" className="btn btn-flame mt-10 inline-flex">
              Host another →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({
  code,
  joinUrl,
  onEnd,
  dimmed,
}: {
  code: string;
  joinUrl: string;
  onEnd: () => void;
  dimmed: boolean;
}) {
  return (
    <header
      className={`absolute top-0 inset-x-0 z-30 px-6 py-4 flex items-center justify-between gap-4 transition-opacity duration-500 ${
        dimmed ? "opacity-10 hover:opacity-100" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-50">
          Room
        </div>
        <div className="font-mono text-2xl tracking-[0.25em]">{code}</div>
      </div>
      <div className="flex items-center gap-2">
        <CopyLinkButton text={joinUrl} className="text-xs !px-3 !py-1.5 !text-white !border-white/15 hover:!bg-white/10" />
        <button
          onClick={onEnd}
          className="text-xs text-chili hover:text-white border border-chili/30 rounded-full px-3 py-1.5"
        >
          End session
        </button>
      </div>
    </header>
  );
}

function LobbyView({
  code,
  joinUrl,
  players,
  roomId,
  myDecks,
  busy,
  post,
  initialDeckId,
}: {
  code: string;
  joinUrl: string;
  players: Array<{ id: string; displayName: string; role: "host" | "player" }>;
  roomId: string;
  myDecks: Deck[];
  busy: boolean;
  post: (b: object) => Promise<unknown>;
  initialDeckId?: string | null;
}) {
  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_auto] pt-16 pb-10 px-6">
      <div className="grid place-items-center">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.3em] opacity-50">
            Join with your phone
          </div>
          <div className="display text-[14vw] leading-none mt-4 tracking-[0.08em]">
            {code}
          </div>
          <div className="mt-10 inline-flex items-center gap-6 rounded-3xl bg-white text-ink px-6 py-5">
            <QRCode text={joinUrl} size={120} light="#ffffff" />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.3em] text-mute">
                Scan to join
              </div>
              <div className="display text-xl mt-1 max-w-xs break-all leading-tight">
                {joinUrl.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </div>
          <div className="mt-6 opacity-60 text-sm">
            {players.length} {players.length === 1 ? "person" : "people"} in the
            room
          </div>
        </div>
      </div>
      <div className="text-ink">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white text-ink rounded-3xl">
            <SetupCard
              roomId={roomId}
              myDecks={myDecks}
              players={players}
              busy={busy}
              onAction={post}
              initialDeckId={initialDeckId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewView({
  round,
  presenter,
  skipVotes,
  busy,
  onLockAndStart,
}: {
  round: NonNullable<ReturnType<typeof useRoom>["data"]>["currentRound"];
  presenter: string;
  skipVotes: Record<string, number>;
  busy: boolean;
  onLockAndStart: () => Promise<void>;
}) {
  if (!round) return null;
  return (
    <div className="absolute inset-0 pt-16 pb-8 px-8 flex flex-col">
      <div className="text-center mb-4">
        <div className="text-sm uppercase tracking-[0.3em] opacity-50">
          Audience preview · cut the boring ones
        </div>
        <div className="display text-4xl mt-2">
          {presenter} <span className="opacity-50">on</span>{" "}
          <span className="italic">&ldquo;{round.deck.title}&rdquo;</span>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-auto px-2 pb-2">
        {round.slides.map((rs) => {
          const votes = skipVotes[rs.slideId] ?? 0;
          return (
            <div
              key={rs.id}
              className={`relative aspect-video rounded-xl border border-white/10 overflow-hidden bg-white ${
                rs.skipped ? "opacity-30" : ""
              }`}
            >
              <PreviewSlide
                deckId={round.deck.id}
                src={rs.src}
                kind={rs.kind}
              />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur font-mono text-[10px]">
                {String(rs.orderIndex + 1).padStart(2, "0")}
              </div>
              {votes > 0 && (
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-flame text-white text-[10px] font-mono">
                  skip {votes}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center pt-4">
        <button
          onClick={onLockAndStart}
          disabled={busy}
          className="btn btn-flame disabled:opacity-50"
        >
          Lock in &amp; start presenting →
        </button>
      </div>
    </div>
  );
}

function PreviewSlide({
  deckId,
  src,
  kind,
}: {
  deckId: string;
  src: string;
  kind: "image" | "html";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / 1280);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      {kind === "image" ? (
        <SlideRender deckId={deckId} src={src} kind="image" fit="cover" inert />
      ) : scale > 0 ? (
        <SlideRender deckId={deckId} src={src} kind="html" scale={scale} inert />
      ) : (
        <div className="absolute inset-0 shimmer" />
      )}
    </div>
  );
}

function PresentingControls({
  current,
  total,
  busy,
  hidden,
  onPrev,
  onNext,
  onEnd,
}: {
  current: number;
  total: number;
  busy: boolean;
  hidden: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 px-6 pb-6 transition-opacity duration-500 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="mx-auto max-w-3xl flex items-center justify-between gap-3 rounded-full bg-black/70 backdrop-blur border border-white/10 px-4 py-3">
        <div className="font-mono text-xs opacity-70 tabular-nums">
          {current + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={busy || current === 0}
            className="text-sm px-4 py-2 rounded-full border border-white/15 hover:bg-white/10 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            onClick={onNext}
            disabled={busy || current >= total - 1}
            className="text-sm px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <button
          onClick={onEnd}
          disabled={busy}
          className="text-sm px-4 py-2 rounded-full bg-flame text-white hover:brightness-110 disabled:opacity-50"
        >
          End → rate
        </button>
      </div>
      <div className="text-center mt-2 text-[10px] uppercase tracking-widest opacity-30">
        ← → space to advance · hides when idle
      </div>
    </div>
  );
}

function RatingView({
  presenter,
  ratingProgress,
  busy,
  onReveal,
}: {
  presenter: string;
  ratingProgress: { received: number; total: number } | null;
  busy: boolean;
  onReveal: () => void;
}) {
  const allIn =
    ratingProgress &&
    ratingProgress.received >= ratingProgress.total &&
    ratingProgress.total > 0;
  return (
    <div className="absolute inset-0 grid place-items-center px-10">
      <div className="text-center">
        <div className="text-sm uppercase tracking-[0.3em] opacity-50">
          Tally time
        </div>
        <h2 className="display text-7xl md:text-8xl mt-4">
          Judges are scoring.
        </h2>
        <p className="opacity-60 mt-3 display text-2xl italic">
          {presenter}, stand still.
        </p>
        {ratingProgress && (
          <div className="mt-12">
            <div className="display text-7xl tabular-nums">
              {ratingProgress.received}
              <span className="opacity-40"> / {ratingProgress.total}</span>
            </div>
            <div className="text-xs uppercase tracking-widest opacity-50 mt-2">
              rubrics submitted
            </div>
            <div className="mt-5 mx-auto h-2 rounded-full bg-white/10 overflow-hidden max-w-md">
              <div
                className="h-full bg-flame transition-all duration-500"
                style={{
                  width:
                    ratingProgress.total > 0
                      ? `${(ratingProgress.received / ratingProgress.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        )}
        <button
          onClick={onReveal}
          disabled={busy}
          className={`btn btn-flame mt-12 ${allIn ? "" : "opacity-90"}`}
        >
          {allIn ? "Everyone's in — reveal!" : "Reveal results now"}
        </button>
      </div>
    </div>
  );
}

function LeaderboardView({
  leaderboard,
  highlightId,
  roomId,
  myDecks,
  players,
  busy,
  post,
  replayReveal,
}: {
  leaderboard: NonNullable<ReturnType<typeof useRoom>["data"]>["leaderboard"];
  highlightId: string | null;
  roomId: string;
  myDecks: Deck[];
  players: Array<{ id: string; displayName: string; role: "host" | "player" }>;
  busy: boolean;
  post: (b: object) => Promise<unknown>;
  replayReveal: () => void;
}) {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="absolute inset-0 pt-16 pb-8 px-6 overflow-y-auto">
      <RichLeaderboard rows={leaderboard ?? []} highlightId={highlightId} />

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setShowSetup((v) => !v)}
          className="btn btn-flame"
        >
          {showSetup ? "Hide setup" : "Queue another round"}
        </button>
        <button onClick={replayReveal} className="btn btn-ghost text-white border-white/15 hover:bg-white/10">
          Replay reveal
        </button>
      </div>

      {showSetup && (
        <div className="mt-10 max-w-2xl mx-auto text-ink">
          <div className="bg-white rounded-3xl">
            <SetupCard
              roomId={roomId}
              myDecks={myDecks}
              players={players}
              busy={busy}
              onAction={post}
            />
          </div>
        </div>
      )}
    </div>
  );
}

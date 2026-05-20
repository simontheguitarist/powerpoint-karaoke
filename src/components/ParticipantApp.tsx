"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoom } from "@/lib/use-room";
import { JoinName } from "@/components/JoinName";
import { PreviewCurator } from "@/components/PreviewCurator";
import { RubricForm } from "@/components/RubricForm";
import { SlideRender } from "@/components/SlideRender";

export function ParticipantApp({
  roomId,
  code,
}: {
  roomId: string;
  code: string;
}) {
  const { data, loading, skipVotes, leaderboard, refetch } = useRoom(roomId);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-mute">Loading room {code}…</div>
      </div>
    );
  }

  if (!data.me) {
    return <JoinName code={code} onJoined={refetch} />;
  }

  const me = data.me;
  const round = data.currentRound;
  const isPresenter =
    !!round && round.presenterParticipantId === me.id;

  return (
    <div className="mx-auto max-w-md px-5 py-8 min-h-[100dvh]">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-mute">
            Room
          </div>
          <div className="font-mono text-2xl tracking-[0.2em]">{code}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-mute">You</div>
          <div className="font-medium">{me.displayName}</div>
        </div>
      </header>

      {/* Lobby (no round in progress) */}
      {!round && data.room.state === "lobby" && (
        <Lobby participants={data.participants} />
      )}

      {/* Preview phase */}
      {round && round.state === "preview" && !isPresenter && (
        <PreviewCurator
          round={round}
          skipVotes={skipVotes}
        />
      )}
      {round && round.state === "preview" && isPresenter && (
        <PresenterCurtain title={round.deck.title} />
      )}

      {/* Presenting */}
      {round && round.state === "presenting" && (
        <Spectate round={round} isPresenter={isPresenter} />
      )}

      {/* Rating */}
      {round && round.state === "rating" && !isPresenter && (
        <RubricForm
          roundId={round.id}
          rubric={data.room.config.rubric}
        />
      )}
      {round && round.state === "rating" && isPresenter && (
        <div className="card p-8 text-center">
          <div className="display text-4xl">You&apos;re being judged.</div>
          <p className="text-mute mt-2 text-sm">
            Stand still. Smile. Wait.
          </p>
        </div>
      )}

      {/* Leaderboard / done */}
      {(data.room.state === "leaderboard" ||
        (round && round.state === "done")) && (
        <ParticipantLeaderboard leaderboard={leaderboard ?? []} meId={me.id} />
      )}

      {data.room.state === "ended" && (
        <div className="card p-8 text-center">
          <div className="display text-4xl">That&apos;s a wrap.</div>
          <p className="text-mute mt-2 text-sm">Session ended by the host.</p>
        </div>
      )}
    </div>
  );
}

function Lobby({
  participants,
}: {
  participants: Array<{ id: string; displayName: string; role: string }>;
}) {
  const players = participants.filter((p) => p.role === "player");
  return (
    <div className="card p-6">
      <div className="display text-3xl">Hang tight.</div>
      <p className="text-mute mt-2 text-sm">
        Waiting for the host to start a round.
      </p>
      <div className="mt-5">
        <div className="text-xs uppercase tracking-widest text-mute mb-2">
          In the room ({players.length})
        </div>
        <ul className="space-y-1.5">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-mint" />
              {p.displayName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PresenterCurtain({ title }: { title: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-xs uppercase tracking-widest text-mute">
        Up next
      </div>
      <div className="display text-5xl mt-4">You&apos;re on.</div>
      <p className="text-mute mt-4 max-w-prose mx-auto">
        Your deck is &quot;{title}&quot;. The audience is previewing it now —
        cutting the boring slides for you.
      </p>
      <p className="text-mute mt-4 text-sm italic">
        Don&apos;t look at anyone else&apos;s screen.
      </p>
    </div>
  );
}

function Spectate({
  round,
  isPresenter,
}: {
  round: NonNullable<ReturnType<typeof useRoom>["data"]>["currentRound"];
  isPresenter: boolean;
}) {
  if (!round) return null;
  const active = round.slides.filter((s) => !s.skipped);
  const cur = active[round.currentSlideIndex];
  return (
    <div className="card p-6 text-center">
      <div className="text-xs uppercase tracking-widest text-mute">
        {isPresenter ? "Now showing" : "Watch the screen"}
      </div>
      <div className="display text-4xl mt-2">
        {round.currentSlideIndex + 1}
        <span className="text-mute">/{active.length}</span>
      </div>
      {cur && (
        <div className="mt-6 aspect-video rounded-xl bg-canvas-2 overflow-hidden">
          <SlidePeek deckId={round.deck.id} src={cur.src} kind={cur.kind} />
        </div>
      )}
      {!isPresenter && (
        <p className="text-mute mt-4 text-sm">
          Reactions and ratings coming up after.
        </p>
      )}
    </div>
  );
}

function SlidePeek({
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
    <div ref={wrapRef} className="relative size-full overflow-hidden">
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

function ParticipantLeaderboard({
  leaderboard,
  meId,
}: {
  leaderboard: Array<{
    participantId: string;
    displayName: string;
    overall: number;
    rounds: number;
  }>;
  meId: string;
}) {
  if (leaderboard.length === 0) {
    return (
      <div className="card p-6">
        <div className="display text-3xl">Tallying scores…</div>
      </div>
    );
  }
  return (
    <div className="card p-6">
      <div className="display text-3xl">Leaderboard</div>
      <ul className="mt-4 divide-y">
        {leaderboard.map((row, i) => (
          <li
            key={row.participantId}
            className={`flex items-center justify-between py-3 ${
              row.participantId === meId ? "text-flame font-medium" : ""
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="display text-2xl w-7 text-mute">{i + 1}</span>
              <span>{row.displayName}</span>
            </span>
            <span className="font-mono">{row.overall.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

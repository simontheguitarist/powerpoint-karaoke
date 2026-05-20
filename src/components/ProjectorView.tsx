"use client";
import { useRoom } from "@/lib/use-room";
import { SlideStage } from "@/components/SlideStage";
import { QRCode } from "@/components/QRCode";

export function ProjectorView({
  roomId,
  code,
}: {
  roomId: string;
  code: string;
}) {
  const { data, loading, leaderboard } = useRoom(roomId);

  if (loading || !data) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-black text-white">
        <div className="text-2xl opacity-60">Loading room {code}…</div>
      </div>
    );
  }

  const round = data.currentRound;
  const players = data.participants.filter((p) => p.role === "player");
  const presenter = round
    ? data.participants.find((p) => p.id === round.presenterParticipantId)
    : null;
  const active = round?.slides.filter((s) => !s.skipped) ?? [];
  const cur = round ? active[round.currentSlideIndex] : null;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <header className="absolute top-0 inset-x-0 z-10 p-6 flex items-start justify-between pointer-events-none">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">
            Room code
          </div>
          <div className="font-mono text-3xl tracking-[0.3em]">{code}</div>
        </div>
        {round && presenter && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.3em] opacity-50">
              On stage
            </div>
            <div className="display text-3xl mt-1">{presenter.displayName}</div>
          </div>
        )}
      </header>

      {/* Lobby */}
      {(!round || data.room.state === "lobby") &&
        data.room.state !== "leaderboard" &&
        data.room.state !== "ended" && (
          <div className="flex-1 grid place-items-center">
            <div className="text-center">
              <div className="text-sm uppercase tracking-[0.3em] opacity-50">
                Join from your phone
              </div>
              <div className="display text-[16vw] leading-none mt-4 tracking-[0.1em]">
                {code}
              </div>
              <ProjectorJoin code={code} />
              <div className="mt-8 opacity-70">
                {players.length} {players.length === 1 ? "person" : "people"} in
                the room
              </div>
            </div>
          </div>
        )}

      {/* Preview phase on projector — show the curtain */}
      {round && round.state === "preview" && (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="text-sm uppercase tracking-[0.3em] opacity-50">
              Up next
            </div>
            <div className="display text-9xl mt-4 max-w-7xl mx-auto px-12">
              {round.deck.title}
            </div>
            <div className="mt-12 opacity-60">
              Presenter: <span className="display text-3xl">{presenter?.displayName}</span>
            </div>
            <div className="mt-8 opacity-50 text-sm">
              audience is trimming the deck…
            </div>
          </div>
        </div>
      )}

      {/* Presenting */}
      {round && round.state === "presenting" && cur && (
        <div className="absolute inset-0">
          <SlideStage
            deckId={round.deck.id}
            src={cur.src}
            kind={cur.kind}
            fit="contain"
          />
          <div className="absolute bottom-4 right-6 font-mono text-xs opacity-40">
            {round.currentSlideIndex + 1} / {active.length}
          </div>
        </div>
      )}

      {/* Rating phase */}
      {round && round.state === "rating" && (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="display text-7xl">Tally time.</div>
            <div className="mt-6 opacity-60">Judges are scoring.</div>
            {presenter && (
              <div className="mt-12 display text-3xl opacity-80">
                {presenter.displayName}, stand still.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {data.room.state === "leaderboard" && leaderboard && leaderboard.length > 0 && (
        <div className="flex-1 grid place-items-center p-8">
          <div className="w-full max-w-4xl">
            <div className="text-sm uppercase tracking-[0.3em] opacity-50 text-center mb-6">
              Leaderboard
            </div>
            <ol className="space-y-3">
              {leaderboard.map((row, i) => (
                <li
                  key={row.participantId}
                  className={`flex items-center justify-between rounded-3xl px-8 py-6 ${
                    i === 0
                      ? "bg-flame text-white"
                      : i === 1
                      ? "bg-white/10"
                      : "bg-white/5"
                  }`}
                  style={{ animation: `fadeUp 0.6s ${i * 0.15}s both` }}
                >
                  <div className="flex items-center gap-6">
                    <span className="display text-6xl w-16 opacity-80">
                      {i + 1}
                    </span>
                    <span className="display text-5xl">{row.displayName}</span>
                  </div>
                  <span className="font-mono text-3xl">
                    {row.overall.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {data.room.state === "ended" && (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="display text-9xl">Curtain.</div>
            <div className="mt-6 opacity-60">Session ended.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectorJoin({ code }: { code: string }) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/r/${code}`
      : `/play/r/${code}`;
  return (
    <div className="mt-10 inline-flex items-center gap-6 rounded-3xl bg-white text-ink px-6 py-5">
      <QRCode text={url} size={140} light="#ffffff" />
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-[0.3em] text-mute">
          Scan to join
        </div>
        <div className="display text-2xl mt-1 max-w-xs break-all leading-tight">
          {url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    </div>
  );
}

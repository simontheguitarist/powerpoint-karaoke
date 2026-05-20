"use client";
import { SlideRender } from "@/components/SlideRender";

export type DeckVoteStageProps = {
  presenterName: string;
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
  totalVoters: number;
  isHost: boolean;
  onLock: () => void;
  busy: boolean;
};

export function DeckVoteStage({
  presenterName,
  candidates,
  tally,
  totalBallots,
  totalVoters,
  isHost,
  onLock,
  busy,
}: DeckVoteStageProps) {
  const top = Math.max(0, ...Object.values(tally));
  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="px-12 pt-12 pb-6 text-center">
        <div className="text-sm uppercase tracking-[0.3em] opacity-50">
          Vote for {presenterName}&apos;s deck
        </div>
        <div className="display text-5xl mt-3">
          {totalBallots} / {totalVoters}{" "}
          <span className="opacity-50">votes in</span>
        </div>
      </header>

      <div className="flex-1 grid place-items-center px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {candidates.map((d) => {
            const votes = tally[d.id] ?? 0;
            const isLeader = top > 0 && votes === top;
            return (
              <div
                key={d.id}
                className={`rounded-3xl overflow-hidden border transition ${
                  isLeader
                    ? "border-flame shadow-[0_0_0_4px_rgba(255,77,46,0.2)]"
                    : "border-white/10"
                }`}
              >
                <div className="aspect-video bg-canvas-2 relative">
                  <SlideRender
                    deckId={d.id}
                    src={`decks/${d.id}/thumb.png`}
                    kind="image"
                    fit="cover"
                    inert
                  />
                </div>
                <div className="p-5 bg-black">
                  <div className="display text-2xl leading-tight">
                    {d.title}
                  </div>
                  <div className="text-xs uppercase tracking-widest opacity-50 mt-2 font-mono">
                    {d.slideCount}sl · {d.spiceLevel} ·{" "}
                    {d.source === "ai" ? "AI" : "uploaded"}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div
                      className={`display ${
                        isLeader ? "text-flame text-5xl" : "text-3xl opacity-80"
                      }`}
                    >
                      {votes}
                    </div>
                    <div className="text-xs opacity-50">
                      {votes === 1 ? "vote" : "votes"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isHost && (
        <div className="px-12 pb-10 flex justify-center">
          <button
            onClick={onLock}
            disabled={busy}
            className="btn btn-flame text-base disabled:opacity-50"
          >
            Lock in &amp; start the round →
          </button>
        </div>
      )}
    </div>
  );
}

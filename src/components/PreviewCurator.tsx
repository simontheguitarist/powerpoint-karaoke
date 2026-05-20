"use client";
import { useState } from "react";

type Round = {
  id: string;
  deck: { id: string; title: string };
  slides: Array<{
    id: string;
    slideId: string;
    orderIndex: number;
    skipped: boolean;
    kind: "image" | "html";
    src: string;
  }>;
};

export function PreviewCurator({
  round,
  skipVotes,
}: {
  round: Round;
  skipVotes: Record<string, number>;
}) {
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  return (
    <div>
      <div className="card p-5 mb-4">
        <div className="text-xs uppercase tracking-widest text-mute">
          Preview phase
        </div>
        <div className="display text-2xl mt-1">
          Cut the boring ones.
        </div>
        <p className="text-sm text-mute mt-2">
          The presenter can&apos;t see this. Tap any slide you want gone.
        </p>
      </div>
      <ul className="space-y-3">
        {round.slides.map((rs) => {
          const myVote = myVotes.has(rs.slideId);
          const total = skipVotes[rs.slideId] ?? 0;
          const isPending = pending.has(rs.slideId);
          return (
            <li
              key={rs.id}
              className={`card overflow-hidden flex items-center gap-3 p-3 transition ${
                rs.skipped ? "opacity-40" : ""
              } ${myVote ? "ring-2 ring-flame" : ""}`}
            >
              <div className="aspect-video w-24 rounded-lg bg-canvas-2 overflow-hidden relative shrink-0">
                <SlideMini
                  deckId={round.deck.id}
                  src={rs.src}
                  kind={rs.kind}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-mute">
                  Slide {String(rs.orderIndex + 1).padStart(2, "0")}
                </div>
                <div className="text-sm mt-0.5">
                  {total > 0
                    ? `${total} ${total === 1 ? "vote" : "votes"} to cut`
                    : rs.skipped
                    ? "Cut"
                    : "Keep"}
                </div>
              </div>
              <button
                disabled={isPending || rs.skipped}
                onClick={async () => {
                  setPending((p) => new Set(p).add(rs.slideId));
                  const res = await fetch(`/api/rounds/${round.id}/skip-vote`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slideId: rs.slideId }),
                  });
                  setPending((p) => {
                    const n = new Set(p);
                    n.delete(rs.slideId);
                    return n;
                  });
                  if (res.ok) {
                    const { voted } = await res.json();
                    setMyVotes((m) => {
                      const n = new Set(m);
                      if (voted) n.add(rs.slideId);
                      else n.delete(rs.slideId);
                      return n;
                    });
                  }
                }}
                className={`btn ${
                  myVote ? "btn-flame" : "btn-ghost"
                } shrink-0 text-xs px-3 py-2`}
              >
                {isPending ? "…" : myVote ? "Voted ✓" : "Cut"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SlideMini({
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
          transform: "scale(0.075)",
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

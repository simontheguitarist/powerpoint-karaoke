"use client";
import { useState } from "react";
import type { LeaderboardRow } from "@/lib/use-room";

const MEDAL = ["🥇", "🥈", "🥉"];

export function RichLeaderboard({
  rows,
  highlightId,
}: {
  rows: LeaderboardRow[];
  highlightId?: string | null;
}) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center text-sm uppercase tracking-[0.3em] opacity-50 mb-4">
        Session leaderboard
      </div>
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <Entry
            key={row.participantId}
            row={row}
            rank={i}
            highlighted={highlightId === row.participantId}
          />
        ))}
      </ol>
    </div>
  );
}

function Entry({
  row,
  rank,
  highlighted,
}: {
  row: LeaderboardRow;
  rank: number;
  highlighted: boolean;
}) {
  const [open, setOpen] = useState(rank < 1);
  const criteria = Object.entries(row.byCriterion).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <li
      className={`rounded-3xl border ${
        rank === 0
          ? "bg-flame text-white border-flame"
          : "bg-white/5 border-white/10"
      } ${highlighted ? "ring-2 ring-flame ring-offset-4 ring-offset-black" : ""}`}
      style={{ animation: `slideUp 0.6s ${rank * 0.12}s both` }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-6 px-7 py-5 text-left"
      >
        <div className="flex items-center gap-5 min-w-0">
          <span className="display text-4xl w-12 opacity-90 shrink-0">
            {MEDAL[rank] ?? rank + 1}
          </span>
          <div className="min-w-0">
            <div className="display text-3xl truncate">{row.displayName}</div>
            <div className="text-xs uppercase tracking-widest opacity-70 mt-1">
              {row.rounds} round{row.rounds === 1 ? "" : "s"} ·{" "}
              {row.comments.length} comment
              {row.comments.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl tabular-nums">
            {row.overall.toFixed(2)}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {open ? "collapse" : "expand"}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-7 pb-6 pt-1 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70 mb-3">
              By criterion
            </div>
            <ul className="space-y-2.5">
              {criteria.map(([c, v]) => {
                const pct = Math.max(0, Math.min(100, (v / 5) * 100));
                return (
                  <li key={c}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="opacity-90">{c}</span>
                      <span className="font-mono tabular-nums">
                        {v.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className={`mt-1 h-2 rounded-full overflow-hidden ${
                        rank === 0 ? "bg-white/30" : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          rank === 0 ? "bg-white" : "bg-flame"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70 mb-3">
              What the judges said
            </div>
            {row.comments.length === 0 ? (
              <p className="text-sm opacity-60 italic">
                No comments this time.
              </p>
            ) : (
              <ul className="space-y-2">
                {row.comments.map((c, i) => (
                  <li
                    key={i}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      rank === 0 ? "bg-white/15" : "bg-white/5"
                    }`}
                  >
                    <p className="display leading-snug text-lg">
                      &ldquo;{c.text}&rdquo;
                    </p>
                    <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1">
                      — {c.from}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </li>
  );
}

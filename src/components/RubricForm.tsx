"use client";
import { useState } from "react";

export function RubricForm({
  roundId,
  rubric,
}: {
  roundId: string;
  rubric: string[];
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allDone = rubric.every((c) => scores[c] !== undefined);

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="display text-4xl">Submitted ✓</div>
        <p className="text-mute mt-2 text-sm">
          Waiting for everyone else…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-xs uppercase tracking-widest text-mute">
          Score the presenter
        </div>
        <div className="display text-3xl mt-1">Be honest.</div>
        <p className="text-sm text-mute mt-1">
          1 = the slides won. 5 = they nailed it.
        </p>
      </div>

      {rubric.map((c) => (
        <div key={c} className="card p-5">
          <div className="font-medium">{c}</div>
          <div className="mt-3 flex items-center justify-between gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScores((s) => ({ ...s, [c]: n }))}
                className={`size-14 rounded-2xl border display text-2xl transition ${
                  scores[c] === n
                    ? "bg-flame text-white border-flame scale-105"
                    : "hover:bg-canvas-2"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="card p-5">
        <label className="text-xs uppercase tracking-widest text-mute">
          One-line comment (optional)
        </label>
        <input
          className="input mt-2"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 140))}
          placeholder="Best worst slide moment?"
          maxLength={140}
        />
      </div>

      {error && <p className="text-sm text-chili">{error}</p>}

      <button
        disabled={!allDone || submitting}
        onClick={async () => {
          setSubmitting(true);
          setError(null);
          try {
            for (const c of rubric) {
              const res = await fetch(`/api/rounds/${roundId}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  criterion: c,
                  score: scores[c],
                  comment: comment || undefined,
                }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setError(j.error ?? "Couldn't submit.");
                setSubmitting(false);
                return;
              }
            }
            setSubmitted(true);
          } catch {
            setError("Couldn't submit.");
          } finally {
            setSubmitting(false);
          }
        }}
        className="btn btn-flame w-full disabled:opacity-40"
      >
        {submitting
          ? "Submitting…"
          : allDone
          ? "Submit ratings"
          : `Score all ${rubric.length} categories`}
      </button>
    </div>
  );
}

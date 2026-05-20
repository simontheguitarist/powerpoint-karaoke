"use client";
import { useState } from "react";

export function JoinName({
  code,
  onJoined,
}: {
  code: string;
  onJoined: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <div className="text-xs uppercase tracking-widest text-mute">
          Joining room
        </div>
        <div className="font-mono text-3xl tracking-[0.2em] mt-1">{code}</div>
        <h1 className="display text-4xl mt-4">What do we call you?</h1>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/join/${code}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ displayName: trimmed }),
            });
            setSubmitting(false);
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setError(j.error ?? "Couldn't join.");
              return;
            }
            onJoined();
          }}
        >
          <input
            className="input text-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoFocus
          />
          {error && <p className="text-sm text-chili">{error}</p>}
          <button
            type="submit"
            disabled={submitting || name.trim().length === 0}
            className="btn btn-flame w-full disabled:opacity-50"
          >
            {submitting ? "Joining…" : "Join the room"}
          </button>
        </form>
      </div>
    </div>
  );
}

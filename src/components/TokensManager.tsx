"use client";
import { useState } from "react";
import { CopyBlock } from "@/components/CopyBlock";

type Token = {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  createdAt: Date | number | string;
  lastUsedAt: Date | number | string | null;
  revokedAt: Date | number | string | null;
};

export function TokensManager({ initial }: { initial: Token[] }) {
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState("pk-deck skill");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{
    token: string;
    name: string;
  } | null>(null);

  const create = async () => {
    setCreating(true);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "pk-deck skill" }),
    });
    setCreating(false);
    if (!res.ok) {
      alert("Couldn't create token.");
      return;
    }
    const j = await res.json();
    setJustCreated({ token: j.token, name: j.name });
    setTokens((prev) => [
      {
        id: j.id,
        name: j.name,
        prefix: j.prefix,
        suffix: j.suffix,
        createdAt: Date.now(),
        lastUsedAt: null,
        revokedAt: null,
      },
      ...prev,
    ]);
    setName("pk-deck skill");
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this token? Anything using it will stop working.")) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Couldn't revoke.");
      return;
    }
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, revokedAt: Date.now() } : t))
    );
  };

  return (
    <div className="space-y-6">
      {justCreated && (
        <div className="card p-6 border-flame/40 bg-flame-soft">
          <div className="text-xs uppercase tracking-widest text-flame mb-1">
            Copy this now — it won&apos;t show again
          </div>
          <div className="font-medium mb-3">{justCreated.name}</div>
          <CopyBlock text={justCreated.token} />
          <button
            onClick={() => setJustCreated(null)}
            className="mt-4 text-xs text-mute hover:text-ink"
          >
            I&apos;ve saved it — hide
          </button>
        </div>
      )}

      <div className="card p-6">
        <div className="text-xs uppercase tracking-widest text-mute">
          Create a new token
        </div>
        <div className="mt-3 flex gap-3">
          <input
            className="input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's this for?"
            maxLength={40}
          />
          <button
            onClick={create}
            disabled={creating}
            className="btn btn-flame shrink-0 disabled:opacity-50"
          >
            {creating ? "Generating…" : "Generate token"}
          </button>
        </div>
      </div>

      <div className="card p-2">
        {tokens.length === 0 ? (
          <div className="p-6 text-sm text-mute text-center">
            No tokens yet.
          </div>
        ) : (
          <ul className="divide-y">
            {tokens.map((t) => {
              const revoked = !!t.revokedAt;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div
                      className={`font-medium ${
                        revoked ? "text-mute line-through" : ""
                      }`}
                    >
                      {t.name}
                    </div>
                    <div className="text-xs text-mute font-mono mt-0.5">
                      {t.prefix}…{t.suffix} ·{" "}
                      {revoked
                        ? "revoked"
                        : t.lastUsedAt
                        ? `used ${relativeTime(t.lastUsedAt)}`
                        : "never used"}
                    </div>
                  </div>
                  {!revoked && (
                    <button
                      onClick={() => revoke(t.id)}
                      className="text-xs text-chili hover:underline shrink-0"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(ts: Date | number | string): string {
  const d = typeof ts === "object" ? ts.valueOf() : new Date(ts).valueOf();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

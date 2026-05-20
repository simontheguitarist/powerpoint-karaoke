"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function LibraryFilters({
  allTags,
  initial,
}: {
  allTags: string[];
  initial: { q: string; tag: string; spice: string; source: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    start(() => router.replace(`/library?${next.toString()}`));
  };

  return (
    <div className="card p-5 space-y-4">
      <input
        defaultValue={initial.q}
        onChange={(e) => set("q", e.target.value)}
        placeholder="Search titles…"
        className="input"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-widest text-mute mr-2">Spice</span>
        {(["", "mild", "medium", "spicy"] as const).map((s) => (
          <button
            key={s || "any"}
            onClick={() => set("spice", s)}
            className={`px-3 py-1.5 rounded-full border transition ${
              initial.spice === s
                ? "bg-ink text-canvas border-ink"
                : "hover:bg-canvas-2"
            }`}
          >
            {s || "any"}
          </button>
        ))}
        <span className="uppercase tracking-widest text-mute ml-4 mr-2">
          Source
        </span>
        {(["", "upload", "ai"] as const).map((s) => (
          <button
            key={s || "any"}
            onClick={() => set("source", s)}
            className={`px-3 py-1.5 rounded-full border transition ${
              initial.source === s
                ? "bg-ink text-canvas border-ink"
                : "hover:bg-canvas-2"
            }`}
          >
            {s === "ai" ? "AI" : s === "upload" ? "Uploads" : "any"}
          </button>
        ))}
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="uppercase tracking-widest text-mute mr-2">Tags</span>
          <button
            onClick={() => set("tag", "")}
            className={`px-3 py-1.5 rounded-full border transition ${
              !initial.tag ? "bg-ink text-canvas border-ink" : "hover:bg-canvas-2"
            }`}
          >
            all
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => set("tag", t)}
              className={`px-3 py-1.5 rounded-full border font-mono transition ${
                initial.tag === t
                  ? "bg-flame text-white border-flame"
                  : "hover:bg-canvas-2"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

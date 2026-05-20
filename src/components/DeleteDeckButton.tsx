"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDeckButton({
  deckId,
  title,
}: {
  deckId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost text-sm text-chili border-chili/30 hover:bg-chili/5"
      >
        Delete deck
      </button>
    );
  }

  const armed = confirm.trim().toUpperCase() === "DELETE";

  return (
    <div className="card p-5 w-full md:w-[420px] border-chili/30">
      <div className="text-sm">
        Type <span className="font-mono font-medium">DELETE</span> to remove{" "}
        <strong>{title}</strong> for good.
      </div>
      <input
        autoFocus
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="DELETE"
        className="input mt-3 font-mono uppercase tracking-[0.2em]"
      />
      {error && <p className="text-sm text-chili mt-2">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          className="btn btn-ghost text-sm"
          disabled={busy}
        >
          Cancel
        </button>
        <button
          disabled={!armed || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch(`/api/decks/${deckId}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setError(j?.error ?? "Couldn't delete.");
              setBusy(false);
              return;
            }
            router.replace("/library");
            router.refresh();
          }}
          className="btn btn-flame text-sm disabled:opacity-40"
          style={
            armed
              ? { backgroundColor: "var(--color-chili)", color: "white" }
              : undefined
          }
        >
          {busy ? "Deleting…" : "Delete it"}
        </button>
      </div>
    </div>
  );
}

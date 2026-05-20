"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartGameButton({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deckId }),
          });
          if (!res.ok) {
            setLoading(false);
            if (res.status === 401) {
              router.push("/sign-in?next=/library/" + deckId);
              return;
            }
            const data = await res.json().catch(() => ({}));
            setError(data?.error ?? "Couldn't start the game.");
            return;
          }
          const { id } = await res.json();
          router.push(`/play/host/${id}`);
        }}
        className="btn btn-flame w-full disabled:opacity-50"
      >
        {loading ? "Starting…" : "Host a game with this deck"}
      </button>
      {error && <p className="text-sm text-chili mt-2">{error}</p>}
    </>
  );
}

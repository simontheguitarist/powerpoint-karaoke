"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HostStartButton({
  className = "btn btn-flame",
  label = "Open a room",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (!res.ok) {
            setLoading(false);
            if (res.status === 401) {
              router.push("/sign-in");
              return;
            }
            const j = await res.json().catch(() => ({}));
            setError(j?.error ?? "Couldn't open a room.");
            return;
          }
          const { id } = await res.json();
          router.push(`/play/host/${id}`);
        }}
        className={`${className} disabled:opacity-50`}
      >
        {loading ? "Opening…" : label}
      </button>
      {error && <p className="text-sm text-chili mt-2">{error}</p>}
    </div>
  );
}

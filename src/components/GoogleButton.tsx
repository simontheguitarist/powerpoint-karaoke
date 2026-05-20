"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleButton({ callbackURL = "/studio" }: { callbackURL?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await authClient.signIn.social({ provider: "google", callbackURL });
      }}
      className="btn btn-ghost w-full disabled:opacity-50"
    >
      <GoogleMark />
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7a5.41 5.41 0 0 1 0-3.4V4.96H.95a9 9 0 0 0 0 8.08l3-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .95 4.96l3 2.34C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

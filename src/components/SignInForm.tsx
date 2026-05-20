"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await authClient.signIn.email({ email, password });
        setLoading(false);
        if (error) {
          setError(error.message ?? "Couldn't sign you in.");
          return;
        }
        router.refresh();
        router.push("/studio");
      }}
      className="space-y-3"
    >
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
        autoComplete="email"
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
        autoComplete="current-password"
        minLength={8}
      />
      {error && <p className="text-sm text-chili">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

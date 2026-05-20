"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
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
        const { error } = await authClient.signUp.email({
          name,
          email,
          password,
        });
        setLoading(false);
        if (error) {
          setError(error.message ?? "Couldn't create your account.");
          return;
        }
        router.refresh();
        router.push("/studio");
      }}
      className="space-y-3"
    >
      <input
        type="text"
        required
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        autoComplete="name"
      />
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
        placeholder="Password (8+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
        autoComplete="new-password"
        minLength={8}
      />
      {error && <p className="text-sm text-chili">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-flame w-full disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

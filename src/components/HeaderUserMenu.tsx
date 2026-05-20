"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function HeaderUserMenu({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="text-sm px-3 py-2 rounded-full hover:bg-canvas-2"
        >
          Sign in
        </Link>
        <Link href="/sign-up" className="btn btn-primary">
          Get started
        </Link>
      </div>
    );
  }

  const initial = user.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border hover:bg-canvas-2"
      >
        <span className="grid place-items-center size-7 rounded-full bg-ink text-canvas text-xs font-semibold">
          {initial}
        </span>
        <span className="text-sm hidden sm:inline">{user.name}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 card p-2 text-sm"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 py-2 border-b mb-1">
            <div className="font-medium">{user.name}</div>
            <div className="text-mute text-xs truncate">{user.email}</div>
          </div>
          <Link
            href="/studio"
            className="block px-3 py-2 rounded-lg hover:bg-canvas-2"
          >
            My decks
          </Link>
          <Link
            href="/studio/generate"
            className="block px-3 py-2 rounded-lg hover:bg-canvas-2"
          >
            Generate with AI
          </Link>
          <Link
            href="/studio/upload"
            className="block px-3 py-2 rounded-lg hover:bg-canvas-2"
          >
            Upload a deck
          </Link>
          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-canvas-2 text-mute"
            onClick={async () => {
              await authClient.signOut();
              router.refresh();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

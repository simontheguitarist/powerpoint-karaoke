"use client";
import { useState } from "react";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative group">
      <pre className="rounded-xl bg-ink text-canvas font-mono text-xs p-4 pr-24 overflow-auto max-h-72 whitespace-pre-wrap">
        {text}
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full bg-canvas text-ink hover:bg-flame hover:text-white transition"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

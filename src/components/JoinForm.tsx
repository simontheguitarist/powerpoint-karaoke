"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinForm() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const valid = /^[A-Z0-9]{4,8}$/.test(code);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        router.push(`/play/r/${code}`);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={code}
        onChange={(e) =>
          setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
        }
        placeholder="ROOM CODE"
        className="input font-mono uppercase tracking-[0.4em] text-center text-xl"
        maxLength={8}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={!valid}
        className="btn btn-primary shrink-0 disabled:opacity-40"
      >
        Join
      </button>
    </form>
  );
}

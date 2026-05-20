import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { room } from "@/lib/db/schema";
import { ParticipantApp } from "@/components/ParticipantApp";
import { JoinForm } from "@/components/JoinForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Room ${code.toUpperCase()} · PowerPoint Karaoke` };
}

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();

  if (!/^[A-Z0-9]{4,8}$/.test(upper)) {
    return <CodeMissPage code={upper} reason="malformed" />;
  }

  const r = await db.query.room.findFirst({ where: eq(room.code, upper) });
  if (!r) return <CodeMissPage code={upper} reason="not-found" />;
  if (r.state === "ended")
    return <CodeMissPage code={upper} reason="ended" />;

  return <ParticipantApp roomId={r.id} code={upper} />;
}

function CodeMissPage({
  code,
  reason,
}: {
  code: string;
  reason: "not-found" | "ended" | "malformed";
}) {
  const headline =
    reason === "ended"
      ? "That room is closed."
      : reason === "malformed"
      ? "That code doesn't look right."
      : "We don't know that code.";

  const body =
    reason === "ended"
      ? "The host already wrapped this session. Catch them for a new code, or browse the library while you wait."
      : reason === "malformed"
      ? "Room codes are 4–8 letters and numbers. Double-check what your host shared."
      : "Could be a typo, or the host hasn't started a room yet. Try again, or grab the host and ask for a fresh code.";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <div className="pill border-flame text-flame bg-flame-soft">
          {reason === "ended" ? "Session ended" : "No room"}
        </div>
        <div className="mt-5 font-mono text-2xl tracking-[0.25em] text-mute line-through">
          {code || "—"}
        </div>
        <h1 className="display text-4xl mt-3 leading-[1.05]">{headline}</h1>
        <p className="text-sm text-mute mt-3 leading-relaxed">{body}</p>

        <div className="mt-7">
          <div className="text-xs uppercase tracking-widest text-mute mb-2">
            Try a different code
          </div>
          <JoinForm />
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/play" className="text-mute hover:text-ink">
            ← Back to play
          </Link>
          <Link href="/library" className="text-mute hover:text-ink">
            Browse the library
          </Link>
        </div>
      </div>
    </div>
  );
}

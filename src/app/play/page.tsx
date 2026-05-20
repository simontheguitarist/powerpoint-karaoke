import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";
import { HostStartButton } from "@/components/HostStartButton";
import { getOptionalUser } from "@/lib/session";

export const metadata = { title: "Play · PowerPoint Karaoke" };
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getOptionalUser();
  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid lg:grid-cols-2 gap-10">
        <section className="card p-10">
          <div className="pill border-flame text-flame bg-flame-soft">
            For the audience
          </div>
          <h1 className="display text-6xl mt-4">Join with a code.</h1>
          <p className="text-mute mt-3">
            Your host will give you a 6-letter code. No account needed.
          </p>
          <div className="mt-8">
            <JoinForm />
          </div>
        </section>

        <section className="card p-10 bg-canvas-2/40">
          <div className="pill">Host</div>
          <h1 className="display text-6xl mt-4">
            Open a room.
            <br />
            <span className="italic">Run the show.</span>
          </h1>
          <p className="text-mute mt-3 leading-relaxed">
            Get a 6-letter code in one click. Pick a deck, draw one at random,
            or open it up to a group vote — all from inside the room.
          </p>
          {user ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <HostStartButton />
              <Link href="/library" className="text-sm text-mute hover:text-ink">
                or browse decks first →
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in" className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn btn-flame">
                Create an account
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

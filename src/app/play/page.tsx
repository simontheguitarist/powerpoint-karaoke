import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";
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
            Host a game.
            <br />
            <span className="italic">Run the room.</span>
          </h1>
          <p className="text-mute mt-3">
            Pick a deck from your library, share the code, run the rounds. You
            need to be signed in.
          </p>
          {user ? (
            <Link href="/library" className="btn btn-flame mt-8 inline-flex">
              Pick a deck from your library
            </Link>
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

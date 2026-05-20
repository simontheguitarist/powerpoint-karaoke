import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";

export const metadata = { title: "Lost · PowerPoint Karaoke" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="pill mx-auto">404 · nothing here</div>
      <h1 className="display text-7xl md:text-8xl mt-6 leading-[0.95]">
        Wrong slide.
      </h1>
      <p className="text-mute mt-5 max-w-md mx-auto leading-relaxed">
        The page you were looking for either never existed, got deleted, or
        you typed the URL like a presenter improvising. Pick a path:
      </p>

      <div className="card p-6 mt-10 max-w-md mx-auto text-left">
        <div className="text-xs uppercase tracking-widest text-mute mb-2">
          Got a room code?
        </div>
        <JoinForm />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
        <Link href="/library" className="btn btn-primary">
          Browse the library
        </Link>
        <Link href="/play" className="btn btn-flame">
          Host a game
        </Link>
      </div>
    </div>
  );
}

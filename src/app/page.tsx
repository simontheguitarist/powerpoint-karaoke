import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 grid-stage opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-mute">
                <span className="size-1.5 rounded-full bg-flame pulse-soft" />
                PowerPoint Karaoke · live improv
              </div>
              <h1 className="display mt-6 text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95]">
                Speak first.
                <br />
                <span className="italic text-flame">Think</span> later.
              </h1>
              <p className="mt-7 max-w-xl text-lg text-mute leading-relaxed">
                One person presents a deck they&apos;ve never seen. The rest of
                the room scores every panicked second — humor, recovery,
                confidence, sheer slide mockery.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/play" className="btn btn-flame">
                  Host a game
                  <span aria-hidden>→</span>
                </Link>
                <Link href="/library" className="btn btn-ghost">
                  Browse the library
                </Link>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md">
                <Stat n="6" label="letter join code" />
                <Stat n="∞" label="absurd topics" />
                <Stat n="1" label="brave presenter" />
              </dl>
            </div>

            <div className="lg:col-span-5">
              <div className="card p-7">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-mute">
                    Join a game
                  </div>
                  <div className="text-xs text-mute">
                    no account · free forever
                  </div>
                </div>
                <JoinForm />
                <p className="text-xs text-mute mt-4 leading-relaxed">
                  Got a code from a host? Drop it in to land in the lobby. To
                  host or upload decks, you&apos;ll need an account.
                </p>
              </div>

              <Link
                href="/studio/generate"
                className="mt-4 flex items-center justify-between rounded-2xl border bg-canvas-2/60 px-5 py-4 text-sm hover:bg-canvas-2 transition"
              >
                <span>
                  <span className="block text-xs uppercase tracking-[0.25em] text-mute mb-1">
                    New
                  </span>
                  Generate a deck with the <strong>pk-deck</strong> Claude skill
                </span>
                <span aria-hidden className="text-mute">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-10 mb-12">
          <div className="lg:col-span-5">
            <div className="pill">How it works</div>
            <h2 className="display text-5xl md:text-6xl mt-4 leading-[0.95]">
              Three steps.
              <br />
              One brave presenter.
            </h2>
          </div>
          <p className="lg:col-span-6 lg:col-start-7 text-mute text-lg leading-relaxed self-end">
            No installs for players. No coordination beyond a room code and an
            apology to whoever&apos;s up next.
          </p>
        </div>

        <ol className="divide-y border-y">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="grid grid-cols-12 gap-6 py-10 items-start"
            >
              <div className="col-span-2 md:col-span-1 display text-5xl md:text-6xl text-flame leading-none">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-span-10 md:col-span-5">
                <h3 className="display text-3xl md:text-4xl leading-tight">
                  {s.title}
                </h3>
              </div>
              <p className="col-span-12 md:col-span-6 text-mute leading-relaxed md:pt-2">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* FEATURE STRIP */}
      <section className="border-y bg-canvas-2/40">
        <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <div className="pill">The good bit</div>
            <h2 className="display text-5xl md:text-6xl mt-4 leading-[0.95]">
              The audience runs the show.
            </h2>
            <p className="mt-6 text-mute leading-relaxed">
              Before the round starts, your friends preview the deck and{" "}
              <em>vote-skip the boring slides</em>. The presenter walks in cold
              to a curated chaos — then gets rated on poise, recovery, and how
              hard they sold it.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 rounded-full bg-flame shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <PreviewMock />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="card p-10 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 grid-stage opacity-40" />
          <div className="relative grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-7">
              <h2 className="display text-5xl md:text-6xl leading-[0.95]">
                Ready to embarrass
                <br />
                a coworker?
              </h2>
              <p className="text-mute mt-4 max-w-md leading-relaxed">
                Sign up to upload decks, install the pk-deck skill, and start
                ruining your coworkers&apos; afternoons.
              </p>
            </div>
            <div className="md:col-span-5 flex flex-wrap justify-start md:justify-end gap-3">
              <Link href="/sign-up" className="btn btn-flame">
                Create an account
              </Link>
              <Link href="/play" className="btn btn-primary">
                Host a game
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <dt className="display text-4xl md:text-5xl leading-none">{n}</dt>
      <dd className="text-xs uppercase tracking-widest text-mute mt-2">
        {label}
      </dd>
    </div>
  );
}

const STEPS = [
  {
    title: "Get a deck.",
    body: "Upload PPTX, PDF, or images — or run the pk-deck Claude skill on your own machine to generate something absurd on any topic.",
  },
  {
    title: "Open a room.",
    body: "Get a 6-letter code. Players join from their phones, no app or account required. The big screen handles the slides.",
  },
  {
    title: "Improvise. Get scored.",
    body: "Present cold. The audience pre-trims boring slides, then rates humor, recovery, confidence, and slide mockery. Leaderboard reveal at the end.",
  },
];

const FEATURES = [
  "Multi-device room — host on the big screen, judges on phones",
  "Vote-skip phase before each round to curate the deck",
  "Per-round multi-criteria rubric with animated leaderboard reveal",
  "Downloadable Claude skill — generation runs on your machine, not the server",
];

function PreviewMock() {
  const slides = [
    { skipped: false, label: "Pasta Geopolitics", votes: 1 },
    { skipped: true, label: "(skipped)", votes: 3 },
    { skipped: false, label: "Birds with Jobs", votes: 0 },
    { skipped: false, label: "The Year 2031", votes: 2 },
    { skipped: true, label: "(skipped)", votes: 4 },
    { skipped: false, label: "Cursed Charts", votes: 1 },
  ];
  return (
    <div className="card p-6 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs uppercase tracking-[0.25em] text-mute">
          Preview phase
        </div>
        <div className="font-mono text-xs flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-flame pulse-soft" />
          00:18 remaining
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`aspect-video rounded-xl border p-3 text-xs ${
              s.skipped
                ? "bg-canvas-2 text-mute line-through"
                : "bg-white shadow-card"
            }`}
          >
            <div className="font-mono text-[10px] text-mute">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="mt-3 font-medium leading-tight">{s.label}</div>
            {!s.skipped && (
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-flame">
                Skip {s.votes}/5
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 text-xs text-mute">
        Tap a slide to vote it off. When 50% agree, it&apos;s out — and the
        presenter never sees it.
      </div>
    </div>
  );
}

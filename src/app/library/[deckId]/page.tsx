import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, deckTag, slide } from "@/lib/db/schema";
import { SlideThumb } from "@/components/SlideThumb";
import { StartGameButton } from "@/components/StartGameButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const d = await db.query.deck.findFirst({ where: eq(deck.id, deckId) });
  return { title: d ? `${d.title} · Library` : "Deck · Library" };
}

const SPICE_COLOR: Record<string, string> = {
  mild: "bg-mint",
  medium: "bg-amber",
  spicy: "bg-chili",
};

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const d = await db.query.deck.findFirst({ where: eq(deck.id, deckId) });
  if (!d) notFound();

  const tags = (await db.select().from(deckTag).where(eq(deckTag.deckId, deckId))).map(
    (t) => t.tag
  );
  const slides = await db
    .select()
    .from(slide)
    .where(eq(slide.deckId, deckId))
    .orderBy(asc(slide.index));

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <Link href="/library" className="text-sm text-mute hover:text-ink">
        ← Library
      </Link>

      <header className="mt-6 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="pill">
              {d.source === "ai" ? "AI · pk-deck skill" : "Uploaded"}
            </span>
            <span className="pill flex items-center gap-2">
              <span
                className={`size-1.5 rounded-full ${
                  SPICE_COLOR[d.spiceLevel] ?? "bg-mint"
                }`}
              />
              {d.spiceLevel}
            </span>
            <span className="pill font-mono">{d.slideCount} slides</span>
            {d.status !== "ready" && (
              <span className="pill bg-flame-soft text-flame border-flame">
                {d.status}
              </span>
            )}
          </div>
          <h1 className="display text-6xl">{d.title}</h1>
          {d.description && (
            <p className="text-mute mt-4 text-lg max-w-2xl">{d.description}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/library?tag=${encodeURIComponent(t)}`}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-canvas-2 hover:bg-flame hover:text-white"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="card p-6">
            <h3 className="display text-2xl">Ready to roast?</h3>
            <p className="text-sm text-mute mt-2">
              Start a game with this deck. You&apos;ll get a room code to share.
            </p>
            <div className="mt-4">
              <StartGameButton deckId={d.id} />
            </div>
          </div>
        </div>
      </header>

      <section className="mt-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="display text-3xl">All slides</h2>
          <span className="text-xs uppercase tracking-widest text-mute">
            {slides.length} total
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {slides.map((s) => (
            <SlideThumb key={s.id} deckId={d.id} slide={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

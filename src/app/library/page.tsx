import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, deckTag } from "@/lib/db/schema";
import { DeckCard } from "@/components/DeckCard";
import { LibraryFilters } from "@/components/LibraryFilters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library · PowerPoint Karaoke" };

type SearchParams = Promise<{
  q?: string;
  tag?: string;
  spice?: string;
  source?: string;
}>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const wantTag = (sp.tag ?? "").trim().toLowerCase();
  const wantSpice = (sp.spice ?? "").trim();
  const wantSource = (sp.source ?? "").trim();

  let decks = await db
    .select()
    .from(deck)
    .where(eq(deck.status, "ready"))
    .orderBy(desc(deck.createdAt));

  // Tag map
  const tagsByDeck = new Map<string, string[]>();
  if (decks.length > 0) {
    const ids = decks.map((d) => d.id);
    const rows = await db
      .select()
      .from(deckTag)
      .where(inArray(deckTag.deckId, ids));
    for (const r of rows) {
      const arr = tagsByDeck.get(r.deckId) ?? [];
      arr.push(r.tag);
      tagsByDeck.set(r.deckId, arr);
    }
  }

  // Filters
  if (q) {
    decks = decks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
    );
  }
  if (wantTag) {
    decks = decks.filter((d) =>
      (tagsByDeck.get(d.id) ?? []).includes(wantTag)
    );
  }
  if (wantSpice && ["mild", "medium", "spicy"].includes(wantSpice)) {
    decks = decks.filter((d) => d.spiceLevel === wantSpice);
  }
  if (wantSource && ["upload", "ai"].includes(wantSource)) {
    decks = decks.filter((d) => d.source === wantSource);
  }

  // All tags across decks for filter chip menu
  const allTags = Array.from(
    new Set(Array.from(tagsByDeck.values()).flat())
  ).sort();

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-10">
        <div className="pill">Library</div>
        <h1 className="display text-6xl mt-3">
          Every deck.
          <br />
          Ready to roast.
        </h1>
      </header>

      <LibraryFilters
        allTags={allTags}
        initial={{ q, tag: wantTag, spice: wantSpice, source: wantSource }}
      />

      {decks.length === 0 ? (
        <div className="card p-12 text-center mt-10">
          <h2 className="display text-4xl">Nothing matches.</h2>
          <p className="text-mute mt-3">
            Try clearing the filters, or{" "}
            <Link href="/studio/upload" className="underline">
              upload a deck
            </Link>{" "}
            to fill this place up.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {decks.map((d) => (
            <DeckCard
              key={d.id}
              deck={d}
              tags={tagsByDeck.get(d.id) ?? []}
              href={`/library/${d.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deck, deckTag } from "@/lib/db/schema";
import { getUserOrRedirect } from "@/lib/session";
import { DeckCard } from "@/components/DeckCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio · PowerPoint Karaoke" };

export default async function StudioPage() {
  const user = await getUserOrRedirect();

  const myDecks = await db
    .select()
    .from(deck)
    .where(eq(deck.ownerId, user.id))
    .orderBy(desc(deck.createdAt));

  const tagsByDeck = new Map<string, string[]>();
  if (myDecks.length > 0) {
    const ids = new Set(myDecks.map((d) => d.id));
    const allTags = await db.select().from(deckTag);
    for (const t of allTags) {
      if (!ids.has(t.deckId)) continue;
      const arr = tagsByDeck.get(t.deckId) ?? [];
      arr.push(t.tag);
      tagsByDeck.set(t.deckId, arr);
    }
  }

  const processing = myDecks.filter((d) => d.status === "processing").length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="flex items-start justify-between gap-6 mb-12">
        <div>
          <div className="pill">Studio</div>
          <h1 className="display text-6xl mt-3">Your decks.</h1>
          <p className="text-mute mt-3 max-w-lg">
            Upload from PPTX, PDF, or images — or have Claude write something
            absurd on any topic. Decks land in your library to use in games.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/studio/generate" className="btn btn-flame">
            Generate with AI
          </Link>
          <Link href="/studio/upload" className="btn btn-primary">
            Upload a deck
          </Link>
        </div>
      </header>

      {processing > 0 && (
        <div className="mb-8 card p-4 flex items-center gap-3 bg-flame-soft border-flame/30">
          <span className="size-2 rounded-full bg-flame pulse-soft" />
          <span className="text-sm">
            {processing} {processing === 1 ? "deck is" : "decks are"} still
            processing — refresh in a moment.
          </span>
        </div>
      )}

      {myDecks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myDecks.map((d) => (
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

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <h2 className="display text-4xl">No decks yet.</h2>
      <p className="text-mute mt-3 max-w-md mx-auto">
        Spin one up by uploading slides you already have, or have AI cook
        something hilarious from a topic prompt.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/studio/generate" className="btn btn-flame">
          Generate with AI
        </Link>
        <Link href="/studio/upload" className="btn btn-primary">
          Upload slides
        </Link>
      </div>
    </div>
  );
}

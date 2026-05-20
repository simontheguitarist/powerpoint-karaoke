import Link from "next/link";
import type { Deck } from "@/lib/db/schema";

const SPICE_COLOR: Record<string, string> = {
  mild: "bg-mint",
  medium: "bg-amber",
  spicy: "bg-chili",
};

export function DeckCard({
  deck,
  tags,
  href,
}: {
  deck: Deck;
  tags: string[];
  href: string;
}) {
  const thumb = `/api/decks/${deck.id}/file/thumb.png`;
  return (
    <Link
      href={href}
      className="card group overflow-hidden flex flex-col hover:shadow-stage transition-shadow"
    >
      <div className="aspect-[16/9] bg-canvas-2 relative overflow-hidden">
        {deck.status === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 size-full object-cover group-hover:scale-[1.03] transition-transform"
          />
        ) : deck.status === "processing" ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-xs uppercase tracking-widest text-mute flex items-center gap-2">
              <span className="size-2 rounded-full bg-flame pulse-soft" />
              Processing
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-xs uppercase tracking-widest text-chili">
              Failed
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="pill bg-white/90 backdrop-blur border-line">
            {deck.source === "ai" ? "AI" : "Upload"}
          </span>
          <span className="pill bg-white/90 backdrop-blur border-line flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                SPICE_COLOR[deck.spiceLevel] ?? "bg-mint"
              }`}
            />
            {deck.spiceLevel}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display text-2xl leading-tight">{deck.title}</h3>
          <span className="font-mono text-xs text-mute shrink-0 mt-1">
            {deck.slideCount}sl
          </span>
        </div>
        {deck.description && (
          <p className="text-sm text-mute mt-2 line-clamp-2">
            {deck.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-canvas-2"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

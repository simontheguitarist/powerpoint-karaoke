import type { Slide } from "@/lib/db/schema";

export function SlideThumb({ deckId, slide }: { deckId: string; slide: Slide }) {
  const url = `/api/decks/${deckId}/file/${slide.src.replace(
    /^decks\/[^/]+\//,
    ""
  )}`;

  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/9] bg-canvas-2 relative">
        {slide.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Slide ${slide.index + 1}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              src={url}
              sandbox="allow-same-origin"
              loading="lazy"
              className="absolute origin-top-left pointer-events-none"
              style={{
                width: 1280,
                height: 720,
                transform: "scale(0.25)",
                transformOrigin: "top left",
              }}
            />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur font-mono text-[10px]">
          {String(slide.index + 1).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Props = {
  deckId: string;
  src: string;
  kind: "image" | "html";
  /** Pixel-scale of the 1280×720 stage. 1 = full-size. */
  scale?: number;
  /** When true, no interaction & no scrolling inside the iframe. */
  inert?: boolean;
  /** "contain" centers the slide inside the wrapper; "cover" fills it. */
  fit?: "contain" | "cover";
  /** Tone for the skeleton; defaults to light. */
  theme?: "light" | "dark";
  className?: string;
};

const STAGE_W = 1280;
const STAGE_H = 720;

function slideUrl(deckId: string, src: string) {
  return `/api/decks/${deckId}/file/${src.replace(/^decks\/[^/]+\//, "")}`;
}

export function SlideRender({
  deckId,
  src,
  kind,
  scale,
  inert = false,
  fit = "contain",
  theme = "light",
  className = "",
}: Props) {
  const url = slideUrl(deckId, src);

  if (kind === "image") {
    return (
      <SlideImage url={url} inert={inert} fit={fit} theme={theme} className={className} />
    );
  }
  return (
    <SlideHtml
      url={url}
      scale={scale}
      inert={inert}
      theme={theme}
      className={className}
    />
  );
}

function SlideImage({
  url,
  inert,
  fit,
  theme,
  className,
}: {
  url: string;
  inert: boolean;
  fit: "contain" | "cover";
  theme: "light" | "dark";
  className: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  return (
    <div className={`relative size-full overflow-hidden ${className}`}>
      {state !== "ok" && <SlideSkeleton theme={theme} />}
      {state === "error" && <SlideError theme={theme} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
        className={`relative size-full transition-opacity duration-300 ${
          state === "ok" ? "opacity-100" : "opacity-0"
        } ${inert ? "pointer-events-none select-none" : ""}`}
        style={{ objectFit: fit }}
      />
    </div>
  );
}

function SlideHtml({
  url,
  scale,
  inert,
  theme,
  className,
}: {
  url: string;
  scale?: number;
  inert: boolean;
  theme: "light" | "dark";
  className: string;
}) {
  // We fetch the slide HTML and feed it to the iframe via srcDoc. That gives
  // us a real loading state + a friendly error message if the API ever
  // returns 403/404/etc (otherwise the iframe would render the raw error
  // body as text — "Forbidden" inside the slide).
  const [html, setHtml] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setHtml(null);
    fetch(url)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setState("error");
          return;
        }
        const text = await r.text();
        if (cancelled) return;
        setHtml(text);
        setState("ok");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const scaledStyle: React.CSSProperties =
    typeof scale === "number"
      ? {
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }
      : { width: "100%", height: "100%" };

  return (
    <div className={`relative size-full overflow-hidden ${className}`}>
      {state !== "ok" && <SlideSkeleton theme={theme} />}
      {state === "error" && <SlideError theme={theme} />}
      <iframe
        title="slide"
        sandbox=""
        srcDoc={html ?? undefined}
        className={`block transition-opacity duration-300 ${
          state === "ok" ? "opacity-100" : "opacity-0"
        } ${inert ? "pointer-events-none" : ""}`}
        style={scaledStyle}
      />
    </div>
  );
}

function SlideSkeleton({ theme }: { theme: "light" | "dark" }) {
  const cls = theme === "dark" ? "shimmer-dark" : "shimmer";
  return (
    <div className={`absolute inset-0 ${cls}`} aria-hidden>
      <div className="absolute inset-x-6 top-6 h-2 rounded-full bg-black/5" />
      <div className="absolute inset-x-6 top-12 h-8 rounded-md bg-black/[0.06] w-3/4" />
      <div className="absolute inset-x-6 bottom-8 h-2 rounded-full bg-black/5 w-1/3" />
    </div>
  );
}

function SlideError({ theme }: { theme: "light" | "dark" }) {
  const fg = theme === "dark" ? "text-white/70" : "text-mute";
  return (
    <div
      className={`absolute inset-0 grid place-items-center p-4 text-center text-xs ${fg}`}
      aria-live="polite"
    >
      <div>
        <div className="display text-lg leading-tight">Slide unavailable.</div>
        <div className="mt-1 opacity-70">Try refreshing the room.</div>
      </div>
    </div>
  );
}

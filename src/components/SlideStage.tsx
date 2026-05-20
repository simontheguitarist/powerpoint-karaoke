"use client";
import { useEffect, useRef, useState } from "react";

export function SlideStage({
  deckId,
  src,
  kind,
  fit = "contain",
}: {
  deckId: string;
  src: string;
  kind: "image" | "html";
  fit?: "contain" | "cover";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s =
        fit === "cover"
          ? Math.max(r.width / 1280, r.height / 720)
          : Math.min(r.width / 1280, r.height / 720);
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const url = `/api/decks/${deckId}/file/${src.replace(/^decks\/[^/]+\//, "")}`;

  return (
    <div
      ref={wrapRef}
      className="relative size-full overflow-hidden bg-black grid place-items-center"
    >
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="size-full"
          style={{ objectFit: fit }}
        />
      ) : (
        <div
          style={{
            width: 1280,
            height: 720,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
          className="relative shrink-0"
        >
          <iframe
            src={url}
            sandbox="allow-same-origin"
            className="size-full block"
          />
        </div>
      )}
    </div>
  );
}

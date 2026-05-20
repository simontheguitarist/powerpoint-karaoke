"use client";
import { useEffect, useRef, useState } from "react";
import { SlideRender } from "@/components/SlideRender";

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
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
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

  return (
    <div
      ref={wrapRef}
      className="relative size-full overflow-hidden bg-black grid place-items-center"
    >
      {kind === "image" ? (
        <SlideRender
          deckId={deckId}
          src={src}
          kind="image"
          fit={fit}
          theme="dark"
        />
      ) : scale > 0 ? (
        <div
          className="relative"
          style={{ width: 1280 * scale, height: 720 * scale }}
        >
          <SlideRender
            deckId={deckId}
            src={src}
            kind="html"
            scale={scale}
            inert
            theme="dark"
          />
        </div>
      ) : (
        <div className="absolute inset-0 shimmer-dark" />
      )}
    </div>
  );
}

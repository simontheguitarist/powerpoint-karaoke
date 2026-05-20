"use client";
import { useEffect, useRef, useState } from "react";
import { SlideRender } from "@/components/SlideRender";
import type { Slide } from "@/lib/db/schema";

export function SlideThumb({ deckId, slide }: { deckId: string; slide: Slide }) {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/9] bg-canvas-2 relative">
        <ScaledSlide deckId={deckId} slide={slide} />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur font-mono text-[10px]">
          {String(slide.index + 1).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

function ScaledSlide({ deckId, slide }: { deckId: string; slide: Slide }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / 1280);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      {slide.kind === "image" ? (
        <SlideRender
          deckId={deckId}
          src={slide.src}
          kind="image"
          fit="cover"
          inert
        />
      ) : scale > 0 ? (
        <SlideRender
          deckId={deckId}
          src={slide.src}
          kind="html"
          scale={scale}
          inert
        />
      ) : (
        <div className="absolute inset-0 shimmer" />
      )}
    </div>
  );
}

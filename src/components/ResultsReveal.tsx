"use client";
import { useEffect, useState } from "react";
import type { RoundResults } from "@/lib/use-room";

export function ResultsReveal({
  results,
  onDone,
}: {
  results: RoundResults;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<
    "intro" | "bars" | "total" | "comments" | "settled"
  >("intro");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("bars"), 700);
    const t2 = setTimeout(() => setStage("total"), 700 + results.byCriterion.length * 350 + 200);
    const t3 = setTimeout(
      () => setStage("comments"),
      700 + results.byCriterion.length * 350 + 1700
    );
    const t4 = setTimeout(
      () => setStage("settled"),
      700 + results.byCriterion.length * 350 + 1700 + Math.min(results.comments.length, 5) * 400 + 1200
    );
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [results.byCriterion.length, results.comments.length]);

  return (
    <div className="absolute inset-0 overflow-y-auto px-10 py-10 pt-20">
      <Confetti show={stage === "total" || stage === "comments" || stage === "settled"} />

      <div className="relative w-full max-w-4xl mx-auto text-center">
        <div
          className={`transition-all duration-700 ${
            stage === "intro" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">
            Round results
          </div>
          <h2 className="display text-6xl md:text-7xl mt-3 leading-[1]">
            {results.presenter.displayName}
          </h2>
          {results.deckTitle && (
            <p className="opacity-70 mt-2 italic display text-2xl">
              on &ldquo;{results.deckTitle}&rdquo;
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-4 text-left">
          {results.byCriterion.map((c, i) => (
            <CriterionBar
              key={c.criterion}
              label={c.criterion}
              value={c.mean}
              show={
                stage === "bars" ||
                stage === "total" ||
                stage === "comments" ||
                stage === "settled"
              }
              delay={i * 250}
            />
          ))}
        </div>

        <div
          className={`mt-10 transition-all duration-700 ${
            stage === "intro" || stage === "bars"
              ? "opacity-0 translate-y-2"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">
            Overall
          </div>
          <div className="display text-[7rem] md:text-[9rem] leading-none text-flame mt-2 tabular-nums">
            <CountUp
              to={results.overall}
              run={stage === "total" || stage === "comments" || stage === "settled"}
            />
          </div>
          <div className="opacity-60 text-sm mt-2">
            from {results.judgeCount} judge{results.judgeCount === 1 ? "" : "s"}
          </div>
        </div>

        {results.comments.length > 0 && (
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {results.comments.slice(0, 6).map((c, i) => (
              <CommentCard
                key={i}
                comment={c}
                show={stage === "comments" || stage === "settled"}
                delay={i * 350}
              />
            ))}
          </div>
        )}

        <div
          className={`mt-10 mb-6 transition-opacity duration-500 ${
            stage === "settled" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button onClick={onDone} className="btn btn-flame">
            On to the leaderboard →
          </button>
        </div>
      </div>
    </div>
  );
}

function CriterionBar({
  label,
  value,
  show,
  delay,
}: {
  label: string;
  value: number;
  show: boolean;
  delay: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div
      className="transition-all duration-500"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateX(0)" : "translateX(-12px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-baseline justify-between text-sm">
        <span className="uppercase tracking-widest opacity-70">{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-flame rounded-full transition-all"
          style={{
            width: show ? `${pct}%` : "0%",
            transitionDelay: `${delay + 80}ms`,
            transitionDuration: "900ms",
          }}
        />
      </div>
    </div>
  );
}

function CountUp({ to, run, duration = 1400 }: { to: number; run: boolean; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf: number;
    const start = performance.now();
    const animate = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setV(to * eased);
      if (k < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [to, run, duration]);
  return <>{v.toFixed(2)}</>;
}

function CommentCard({
  comment,
  show,
  delay,
}: {
  comment: { from: string; text: string };
  show: boolean;
  delay: number;
}) {
  return (
    <div
      className="rounded-2xl bg-white text-ink px-5 py-4 text-left shadow-stage transition-all"
      style={{
        opacity: show ? 1 : 0,
        transform: show
          ? `rotate(${(Math.random() - 0.5) * 2.5}deg) translateY(0)`
          : "rotate(0) translateY(20px)",
        transitionDelay: `${delay}ms`,
        transitionDuration: "600ms",
      }}
    >
      <p className="display text-xl leading-snug">&ldquo;{comment.text}&rdquo;</p>
      <div className="mt-2 text-xs uppercase tracking-widest text-mute">
        — {comment.from}
      </div>
    </div>
  );
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 30 }).map((_, i) => i);
  const colors = ["#ff4d2e", "#3fbb80", "#e8a025", "#3a7bd5", "#ffffff"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 10) * 0.12;
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute top-[-10px] block rounded-sm"
            style={{
              left: `${left}%`,
              width: 8,
              height: 14,
              background: color,
              animation: `confetti-fall 2.8s ${delay}s cubic-bezier(.2,.7,.3,1) forwards`,
              opacity: 0.9,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

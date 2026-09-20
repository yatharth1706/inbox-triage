"use client";

import { useSmoothNumber } from "@/hooks/use-smooth-number";

/** Matches the r=52 circle in the source design: 2πr ≈ 327. */
const CIRCUMFERENCE = 327;

export function ProgressRing({
  percent,
  processed,
  total,
}: {
  percent: number;
  processed: number;
  total: number;
}) {
  // The ring advances in batches; interpolating makes it sweep rather than jump.
  const shown = useSmoothNumber(percent);

  return (
    <div
      role="progressbar"
      aria-label="Classification progress"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${percent}% — ${processed} of ${total} messages classified`}
      className="relative size-[212px]"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-4 animate-glow rounded-full bg-[radial-gradient(circle,#7CE3BC26,transparent_68%)]"
      />
      <div aria-hidden="true" className="absolute -inset-1.5 animate-orbit">
        <div className="absolute left-1/2 top-0 -ml-1 size-2 rounded-full bg-accent" />
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="relative size-[212px] -rotate-90"
      >
        <circle cx="60" cy="60" r="52" fill="none" stroke="#1B1E23" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
        <div className="font-mono text-[34px] font-medium tracking-[-0.02em] tabular-nums">
          {Math.round(shown)}%
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] tabular-nums text-muted-strong">
          {processed} / {total}
        </div>
      </div>
    </div>
  );
}

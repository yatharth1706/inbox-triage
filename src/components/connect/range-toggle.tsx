"use client";

import { RANGE_OPTIONS } from "@/lib/emails";
import type { RangeDays } from "@/lib/types";

export function RangeToggle({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (range: RangeDays) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Mail window"
      className="flex gap-[6px] rounded-xl border border-edge-2 bg-surface-panel p-1"
    >
      {RANGE_OPTIONS.map((range) => {
        const active = range === value;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(range)}
            className={[
              "cursor-pointer rounded-[9px] px-[15px] py-[9px] font-mono text-xs tracking-[0.04em]",
              "transition-colors duration-[180ms]",
              active
                ? "bg-ink font-medium text-canvas"
                : "bg-transparent text-muted-strong hover:text-ink-soft",
            ].join(" ")}
          >
            {range} days
          </button>
        );
      })}
    </div>
  );
}

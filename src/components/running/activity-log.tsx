import type { LogLine } from "@/lib/types";

/** Line box height plus the gap, so each slot sits at index * PITCH. */
const PITCH = 24;
const SLOTS = 4;

/** Decorative: the progress ring already announces state to assistive tech. */
export function ActivityLog({ lines }: { lines: readonly LogLine[] }) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-[18px] font-mono text-[11px] leading-4 text-dim"
      style={{ height: SLOTS * PITCH }}
    >
      {lines.map((line, index) => (
        // Outer element owns the slot position. A CSS animation would override
        // this inline transform once it finished filling, so the entrance
        // animation lives on the inner element instead.
        <div
          key={`${line.t}-${line.text}`}
          className="absolute inset-x-0 transition-[transform,opacity] duration-[420ms] ease-[var(--ease-out-soft)]"
          style={{
            transform: `translate3d(0, ${index * PITCH}px, 0)`,
            opacity: 1 - index * 0.18,
          }}
        >
          <div className="flex h-4 animate-toss gap-[10px] overflow-hidden whitespace-nowrap">
            <span className="flex-none text-faint">{line.t}</span>
            <span className="overflow-hidden text-ellipsis">{line.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

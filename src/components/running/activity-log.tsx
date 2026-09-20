import type { LogLine } from "@/lib/types";

/** Decorative: the progress ring already announces state to assistive tech. */
export function ActivityLog({ lines }: { lines: readonly LogLine[] }) {
  return (
    <div
      aria-hidden="true"
      className="mt-[18px] flex min-h-[88px] flex-col gap-2 font-mono text-[11px] leading-4 text-dim"
    >
      {lines.map((line) => (
        <div
          key={`${line.t}-${line.text}`}
          className="flex h-4 animate-toss gap-[10px] overflow-hidden whitespace-nowrap"
        >
          <span className="flex-none text-faint">{line.t}</span>
          <span className="overflow-hidden text-ellipsis">{line.text}</span>
        </div>
      ))}
    </div>
  );
}

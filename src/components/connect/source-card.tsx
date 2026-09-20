"use client";

import type { SourceDef } from "@/lib/sources";

export function SourceCard({
  source,
  active,
  accent,
  badge,
  onPick,
}: {
  source: SourceDef;
  active: boolean;
  accent: string;
  /** Shown when the source is already authorised, e.g. the connected address. */
  badge?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={[
        "flex cursor-pointer flex-col gap-[9px] rounded-2xl border p-[18px] text-left text-ink",
        "transition-[transform,border-color,background-color] duration-200 ease-[cubic-bezier(.2,1.3,.4,1)]",
        "hover:-translate-y-[3px]",
        active
          ? "border-edge-active bg-surface-source-active"
          : "border-edge bg-surface-tile",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-[10px]">
        <span className="text-[15.5px] font-semibold tracking-[-0.01em]">
          {source.title}
        </span>
        <span
          aria-hidden="true"
          className="size-[10px] flex-none rounded-full border"
          style={{
            borderColor: active ? accent : "#2A2F36",
            background: active ? accent : "transparent",
          }}
        />
      </div>
      <span className="text-[12.5px] leading-[1.55] text-muted-strong">{source.body}</span>
      <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
        <span>{source.meta}</span>
        {badge ? (
          <span
            className="rounded-full border px-2 py-0.5 normal-case tracking-normal"
            style={{ borderColor: `${accent}44`, color: accent }}
          >
            {badge}
          </span>
        ) : null}
      </span>
    </button>
  );
}

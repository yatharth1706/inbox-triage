"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { messageCountFor } from "@/lib/emails";
import { SOURCES, sourceByKey } from "@/lib/sources";
import type { RangeDays, SourceKey } from "@/lib/types";
import { RangeToggle } from "./range-toggle";
import { SourceCard } from "./source-card";

export function ConnectStep({
  source,
  range,
  accent,
  onSelectSource,
  onSelectRange,
  onStart,
}: {
  source: SourceKey;
  range: RangeDays;
  accent: string;
  onSelectSource: (source: SourceKey) => void;
  onSelectRange: (range: RangeDays) => void;
  onStart: () => void;
}) {
  const active = sourceByKey(source);

  return (
    <section className="w-full max-w-[1080px] animate-rise pt-14">
      <Eyebrow>Step 01 — Source</Eyebrow>
      <h1 className="mt-[14px] max-w-[17ch] text-pretty text-[clamp(30px,5vw,46px)] font-semibold leading-[1.04] tracking-[-0.03em]">
        Point JEV at your inbox.
      </h1>
      <p className="mt-[14px] max-w-[54ch] text-pretty text-[15px] leading-[1.6] text-muted-strong">
        It reads the last stretch of mail, sorts every message into a folder with a
        confidence score, and hands the labels back to Gmail when you approve them.
      </p>

      <div className="mt-[34px] grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-3">
        {SOURCES.map((def) => (
          <SourceCard
            key={def.key}
            source={def}
            active={def.key === source}
            accent={accent}
            onPick={() => onSelectSource(def.key)}
          />
        ))}
      </div>

      <div className="mt-[30px] flex flex-wrap items-center gap-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-strong">
          Window
        </div>
        <RangeToggle value={range} onChange={onSelectRange} />
        <div className="font-mono text-[11px] text-dim">
          ≈ {messageCountFor(range)} messages
        </div>
      </div>

      <div className="mt-[30px] flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          className="cursor-pointer rounded-xl bg-accent px-[22px] py-[13px] text-[14px] font-semibold tracking-[-0.01em] text-on-accent transition-transform duration-[180ms] ease-[cubic-bezier(.2,1.3,.4,1)] hover:-translate-y-[2px]"
        >
          {active.cta}
        </button>
        <p className="max-w-[42ch] text-[12.5px] text-dim">{active.hint}</p>
      </div>
    </section>
  );
}

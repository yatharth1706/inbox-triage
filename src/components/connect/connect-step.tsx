"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import type { SessionInfo } from "@/hooks/use-session";
import { messageCountFor } from "@/lib/emails";
import { SOURCES, sourceByKey } from "@/lib/sources";
import type { RangeDays, SourceKey } from "@/lib/types";
import { RangeToggle } from "./range-toggle";
import { SourceCard } from "./source-card";

export function ConnectStep({
  source,
  range,
  accent,
  session,
  error,
  maxMessages,
  onSelectSource,
  onSelectRange,
  onStart,
  onDisconnect,
}: {
  source: SourceKey;
  range: RangeDays;
  accent: string;
  session: SessionInfo;
  error: string | null;
  maxMessages: number;
  onSelectSource: (source: SourceKey) => void;
  onSelectRange: (range: RangeDays) => void;
  onStart: () => void;
  onDisconnect: () => void;
}) {
  const active = sourceByKey(source);
  const isGmail = source === "gmail";
  const needsConsent = isGmail && !session.connected;
  const blocked = isGmail && !session.configured;

  const label = blocked
    ? "Gmail is not configured"
    : needsConsent
      ? "Connect Gmail"
      : isGmail
        ? "Run JEV on your inbox"
        : active.cta;

  const hint = blocked
    ? "This server has no Google or TypeSafe credentials. Set them in .env.local, or run the demo inbox."
    : needsConsent
      ? active.hint
      : isGmail
        ? `Reading up to ${maxMessages} messages from ${session.email || "your mailbox"}.`
        : active.hint;

  return (
    <section className="w-full max-w-[1080px] animate-rise pt-14">
      <Eyebrow>Step 01 — Source</Eyebrow>
      <h1 className="mt-[14px] max-w-[17ch] text-pretty text-[clamp(30px,5vw,46px)] font-semibold leading-[1.04] tracking-[-0.03em]">
        Point JEV at your inbox.
      </h1>
      <p className="mt-[14px] max-w-[54ch] text-pretty text-[15px] leading-[1.6] text-muted-strong">
        It reads the last stretch of mail and sorts every message into a folder with a
        confidence score. Nothing is ever written back to your mailbox.
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-6 max-w-[62ch] rounded-xl border border-[#4A2A2A] bg-[#1A1113] px-4 py-3 text-[13px] leading-[1.55] text-[#F0B4AE]"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-[34px] grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-3">
        {SOURCES.map((def) => (
          <SourceCard
            key={def.key}
            source={def}
            active={def.key === source}
            accent={accent}
            badge={
              def.key === "gmail" && session.connected
                ? session.email || "connected"
                : undefined
            }
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
          {isGmail ? `up to ${maxMessages} messages` : `≈ ${messageCountFor(range)} messages`}
        </div>
      </div>

      <div className="mt-[30px] flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          disabled={blocked}
          className="cursor-pointer rounded-xl bg-accent px-[22px] py-[13px] text-[14px] font-semibold tracking-[-0.01em] text-on-accent transition-transform duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {label}
        </button>
        <p className="max-w-[42ch] text-[12.5px] text-dim">{hint}</p>
        {isGmail && session.connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="cursor-pointer text-[12.5px] text-dim underline underline-offset-4 transition-colors hover:text-ink-soft"
          >
            Disconnect
          </button>
        ) : null}
      </div>
    </section>
  );
}

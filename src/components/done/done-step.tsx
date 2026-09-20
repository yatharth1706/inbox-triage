"use client";

import { useMemo } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ALL_MAIL_COLOR, CATEGORIES } from "@/lib/categories";
import { averageConfidence } from "@/lib/emails";
import type {
  CategoryCounts,
  CategoryId,
  Email,
  Folder,
  FolderFilter,
} from "@/lib/types";
import { EmailCard } from "./email-card";
import { FolderNav } from "./folder-nav";

export function DoneStep({
  classified,
  counts,
  pool,
  visible,
  selected,
  openId,
  total,
  showConfidence,
  bodies,
  loadingBody,
  capped,
  failures,
  error,
  onSelectFolder,
  onToggleOpen,
  onMove,
  onReset,
}: {
  classified: readonly Email[];
  counts: CategoryCounts;
  pool: readonly Email[];
  visible: readonly Email[];
  selected: FolderFilter;
  openId: string | null;
  total: number;
  showConfidence: boolean;
  bodies: Record<string, string>;
  loadingBody: string | null;
  capped: boolean;
  failures: number;
  error: string | null;
  onSelectFolder: (folder: FolderFilter) => void;
  onToggleOpen: (id: string) => void;
  onMove: (id: string, category: CategoryId) => void;
  onReset: () => void;
}) {
  const folders = useMemo<Folder[]>(
    () => [
      { id: "all", label: "All mail", color: ALL_MAIL_COLOR, count: classified.length },
      ...CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        color: category.color,
        count: counts[category.id] ?? 0,
      })),
    ],
    [classified.length, counts],
  );

  const current = folders.find((folder) => folder.id === selected) ?? folders[0];

  const largest = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        label: category.label,
        count: counts[category.id] ?? 0,
      })).sort((a, b) => b.count - a.count)[0],
    [counts],
  );

  const notices = [
    error,
    capped ? `Stopped at the ${total}-message cap for this run.` : null,
    failures > 0 ? `${failures} message${failures === 1 ? "" : "s"} could not be read.` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="w-full max-w-[1080px] animate-rise pt-[42px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-[280px]">
          <Eyebrow tone="accent">Run complete</Eyebrow>
          <h2 className="mt-[11px] text-pretty text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.025em]">
            {classified.length} messages sorted into {CATEGORIES.length} folders
          </h2>
          <p className="mt-[7px] max-w-[56ch] text-pretty text-[13.5px] text-muted-strong">
            Largest folder: {largest.label} ({largest.count}). Open any card to read it, or
            move it here — your mailbox is untouched.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer rounded-[11px] border border-edge-3 bg-transparent px-4 py-[11px] text-[13.5px] font-medium text-ink-soft transition-colors hover:border-edge-hover hover:text-ink"
        >
          New run
        </button>
      </div>

      {notices.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {notices.map((notice) => (
            <p
              key={notice}
              className="rounded-[11px] border border-edge-3 bg-surface-tile px-3 py-2 font-mono text-[11px] text-dim"
            >
              {notice}
            </p>
          ))}
        </div>
      ) : null}

      <FolderNav folders={folders} selected={selected} onSelect={onSelectFolder} />

      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{current.label}</h3>
        <div className="font-mono text-[11px] text-dim">
          {current.count} messages · avg confidence {averageConfidence(pool)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-3">
        {visible.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            open={openId === email.id}
            showConfidence={showConfidence}
            body={email.body ?? bodies[email.id]}
            bodyLoading={loadingBody === email.id}
            onToggle={() => onToggleOpen(email.id)}
            onMove={(category) => onMove(email.id, category)}
          />
        ))}
      </div>
    </section>
  );
}

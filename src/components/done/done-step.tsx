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
  emails,
  counts,
  pool,
  visible,
  selected,
  openId,
  pushed,
  total,
  showConfidence,
  onSelectFolder,
  onToggleOpen,
  onMove,
  onPush,
  onReset,
}: {
  emails: readonly Email[];
  counts: CategoryCounts;
  pool: readonly Email[];
  visible: readonly Email[];
  selected: FolderFilter;
  openId: number | null;
  pushed: boolean;
  total: number;
  showConfidence: boolean;
  onSelectFolder: (folder: FolderFilter) => void;
  onToggleOpen: (id: number) => void;
  onMove: (id: number, category: CategoryId) => void;
  onPush: () => void;
  onReset: () => void;
}) {
  const folders = useMemo<Folder[]>(
    () => [
      { id: "all", label: "All mail", color: ALL_MAIL_COLOR, count: emails.length },
      ...CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        color: category.color,
        count: counts[category.id] ?? 0,
      })),
    ],
    [emails.length, counts],
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

  return (
    <section className="w-full max-w-[1080px] animate-rise pt-[42px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-[280px]">
          <Eyebrow tone="accent">Run complete</Eyebrow>
          <h2 className="mt-[11px] text-pretty text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.025em]">
            {total} messages sorted into {CATEGORIES.length} folders
          </h2>
          <p className="mt-[7px] max-w-[56ch] text-pretty text-[13.5px] text-muted-strong">
            Largest folder: {largest.label} ({largest.count}). Open any card to read it, or
            move it — JEV re-weights the run.
          </p>
        </div>

        <div className="flex flex-wrap gap-[10px]">
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-[11px] border border-edge-3 bg-transparent px-4 py-[11px] text-[13.5px] font-medium text-ink-soft transition-colors hover:border-edge-hover hover:text-ink"
          >
            New run
          </button>
          <button
            type="button"
            onClick={onPush}
            className={[
              "cursor-pointer rounded-[11px] px-4 py-[11px] text-[13.5px] font-semibold",
              "transition-transform duration-[180ms] ease-[cubic-bezier(.2,1.3,.4,1)] hover:-translate-y-[2px]",
              pushed ? "bg-surface-pushed text-accent" : "bg-accent text-on-accent",
            ].join(" ")}
          >
            {pushed ? "Labels written to Gmail ✓" : "Apply labels in Gmail"}
          </button>
        </div>
      </div>

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
            onToggle={() => onToggleOpen(email.id)}
            onMove={(category) => onMove(email.id, category)}
          />
        ))}
      </div>
    </section>
  );
}

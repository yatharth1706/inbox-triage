"use client";

import { CategoryDot } from "@/components/ui/category-dot";
import type { Folder, FolderFilter } from "@/lib/types";

export function FolderNav({
  folders,
  selected,
  onSelect,
}: {
  folders: readonly Folder[];
  selected: FolderFilter;
  onSelect: (folder: FolderFilter) => void;
}) {
  return (
    <nav aria-label="Folders" className="mt-[26px] flex flex-wrap gap-[7px]">
      {folders.map((folder) => {
        const active = folder.id === selected;
        return (
          <button
            key={folder.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(folder.id)}
            className={[
              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2",
              "text-[12.5px] font-medium transition-[color,background-color,border-color] duration-[240ms] ease-[var(--ease-out-gentle)]",
              active
                ? "border-edge-6 bg-surface-nav-active text-ink"
                : "border-edge bg-transparent text-muted hover:text-ink-soft",
            ].join(" ")}
          >
            <CategoryDot color={folder.color} />
            <span>{folder.label}</span>
            <span className="font-mono text-[11px] opacity-60">{folder.count}</span>
          </button>
        );
      })}
    </nav>
  );
}

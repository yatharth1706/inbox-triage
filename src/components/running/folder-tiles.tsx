import { CategoryDot } from "@/components/ui/category-dot";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryCounts } from "@/lib/types";

export function FolderTiles({ counts }: { counts: CategoryCounts }) {
  return (
    <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fit,minmax(142px,1fr))] gap-[10px] p-0">
      {CATEGORIES.map((category) => {
        const count = counts[category.id] ?? 0;
        const filled = count > 0;
        return (
          <li
            key={category.id}
            className={[
              "flex flex-col gap-[9px] rounded-[13px] border px-[13px] py-3",
              "transition-[border-color,background-color] duration-[350ms] ease-out",
              filled
                ? "border-edge-5 bg-surface-tile-active"
                : "border-edge bg-surface-tile",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-2">
              <CategoryDot color={category.color} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium text-ink-soft">
                {category.label}
              </span>
            </div>
            <div
              className={[
                "font-mono text-[21px] font-medium tracking-[-0.02em]",
                filled ? "text-ink" : "text-faint",
              ].join(" ")}
            >
              {count}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

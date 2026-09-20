import { CategoryPill } from "@/components/ui/category-pill";
import { categoryById } from "@/lib/categories";
import { formatConfidence } from "@/lib/emails";
import type { Email } from "@/lib/types";

export function NowClassifying({
  email,
  showConfidence,
}: {
  email: Email | undefined;
  showConfidence: boolean;
}) {
  const category = categoryById(email?.category);

  return (
    <div className="relative min-h-[128px] overflow-hidden rounded-2xl border border-edge-2 bg-surface-panel p-[18px]">
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-px w-[36%] animate-sweep bg-linear-[90deg,transparent,var(--accent),transparent]"
      />
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
        Now classifying
      </div>
      <div key={email?.id} className="animate-toss-fast">
        <div className="mt-[11px] text-pretty text-[16px] font-semibold tracking-[-0.01em]">
          {email?.subject ?? ""}
        </div>
        <div className="mt-[5px] text-[13px] text-muted-strong">{email?.from ?? ""}</div>
        <div className="mt-[13px] flex flex-wrap items-center gap-[10px]">
          <CategoryPill label={category.label} color={category.color} size="md" />
          {showConfidence && email ? (
            <span className="font-mono text-[11px] text-dim">
              confidence {formatConfidence(email.confidence)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useId } from "react";
import { CategoryPill } from "@/components/ui/category-pill";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { avatarStyle, confidenceBarStyle } from "@/lib/category-styles";
import { formatConfidence } from "@/lib/emails";
import type { CategoryId, Email } from "@/lib/types";

export function EmailCard({
  email,
  open,
  showConfidence,
  onToggle,
  onMove,
}: {
  email: Email;
  open: boolean;
  showConfidence: boolean;
  onToggle: () => void;
  onMove: (category: CategoryId) => void;
}) {
  const category = categoryById(email.category);
  const panelId = useId();
  const initial = (email.from || "?").trim().charAt(0).toUpperCase();

  return (
    <article
      className={[
        "animate-pop overflow-hidden rounded-[15px] border",
        "transition-[border-color,background-color] duration-200",
        open ? "border-edge-6 bg-surface-card-open" : "border-edge bg-surface-tile",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer flex-col gap-[9px] px-4 pb-[14px] pt-4 text-left"
      >
        <span className="flex items-center justify-between gap-[10px]">
          <span className="flex min-w-0 items-center gap-[9px]">
            <span
              aria-hidden="true"
              className="inline-flex size-5 flex-none items-center justify-center rounded-md font-mono text-[10px]"
              style={avatarStyle(category.color)}
            >
              {initial}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-muted">
              {email.from}
            </span>
          </span>
          <span className="whitespace-nowrap font-mono text-[10.5px] text-dim-soft">
            {email.day}
          </span>
        </span>

        <span className="text-pretty text-[14px] font-semibold leading-[1.35] tracking-[-0.008em]">
          {email.subject}
        </span>
        <span className="text-pretty text-[12.5px] leading-[1.5] text-muted-soft">
          {email.snippet}
        </span>

        <span className="mt-0.5 flex items-center gap-[9px]">
          <CategoryPill label={category.label} color={category.color} />
          <span className="h-[3px] flex-1 overflow-hidden rounded-sm bg-edge">
            <span
              className="block h-full rounded-sm"
              style={confidenceBarStyle(category.color, email.confidence)}
            />
          </span>
          {showConfidence ? (
            <span className="font-mono text-[10.5px] text-dim">
              {formatConfidence(email.confidence)}
            </span>
          ) : null}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="flex animate-rise-fast flex-col gap-3 border-t border-edge px-4 pb-4 pt-[14px]"
        >
          <p className="text-pretty text-[13px] leading-[1.65] text-ink-body">{email.body}</p>
          <p className="border-l-2 border-edge-4 pl-[10px] font-mono text-[10.5px] leading-[1.6] text-dim">
            jev · {email.reason}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
              Move to
            </span>
            <select
              aria-label={`Move “${email.subject}” to another folder`}
              value={email.category}
              onChange={(event) => onMove(event.target.value as CategoryId)}
              className="cursor-pointer appearance-none rounded-[9px] border border-edge-4 bg-surface-select px-[11px] py-[7px] font-mono text-[11px] text-ink-soft"
            >
              {CATEGORIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </article>
  );
}

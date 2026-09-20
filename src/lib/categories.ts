import type { Category, CategoryId } from "./types";

export const CATEGORIES: readonly Category[] = [
  { id: "reply_needed", label: "Reply needed", color: "#7CE3BC" },
  { id: "interview", label: "Interviews", color: "#B39CF5" },
  { id: "calendar", label: "Meetings", color: "#6FB6F0" },
  { id: "finance", label: "Finance", color: "#8FD6A8" },
  { id: "receipts", label: "Receipts", color: "#F0C36F" },
  { id: "newsletters", label: "Newsletters", color: "#89D4C2" },
  { id: "social", label: "Social", color: "#E3A0D6" },
  { id: "promotional", label: "Promotional", color: "#F09AA8" },
  { id: "spam", label: "Spam", color: "#E0705F" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Falls back to the first category so callers never have to null-check. */
export function categoryById(id: CategoryId | undefined): Category {
  return (id && BY_ID.get(id)) || CATEGORIES[0];
}

export const ALL_MAIL_COLOR = "#E8E9EC";

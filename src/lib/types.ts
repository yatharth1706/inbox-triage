export type CategoryId =
  | "reply_needed"
  | "interview"
  | "calendar"
  | "finance"
  | "receipts"
  | "newsletters"
  | "social"
  | "promotional"
  | "spam";

export interface Category {
  id: CategoryId;
  label: string;
  /** Hex colour, used verbatim and with alpha suffixes for tints. */
  color: string;
}

/** A message template before it is expanded into a dated, scored email. */
export interface SeedMessage {
  category: CategoryId;
  subject: string;
  from: string;
  snippet: string;
  /** Why JEV put it in this folder, shown when a card is expanded. */
  reason: string;
  /** Absent for live mail until the card is expanded and the body is fetched. */
  body?: string;
}

export interface Email extends SeedMessage {
  id: string;
  /** Relative age, e.g. "1d ago". */
  day: string;
  /** 0–1. */
  confidence: number;
}

export type SourceKey = "gmail" | "demo";
export type RangeDays = 30 | 60 | 90;
export type Step = "connect" | "running" | "done";
export type FolderFilter = CategoryId | "all";

export type CategoryCounts = Partial<Record<CategoryId, number>>;

export interface LogLine {
  /** mm:ss cursor into the run. */
  t: string;
  text: string;
}

export interface Folder {
  id: FolderFilter;
  label: string;
  color: string;
  count: number;
}

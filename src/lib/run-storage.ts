import type { CategoryId, Email } from "./types";

/**
 * Persists the last run so a returning visitor sees their results instead of an
 * empty connect screen.
 *
 * Deliberately NOT stored here: OAuth tokens. They live in an httpOnly cookie
 * that scripts cannot read. Anything in localStorage is readable by any script
 * on this origin, so a single XSS would hand an attacker standing access to the
 * mailbox. Only non-secret display data belongs in this file.
 */

const KEY = "jev.run";
/** Bump to invalidate everything previously stored. */
const VERSION = 1;

export interface StoredRun {
  version: number;
  /** "demo", or the connected Gmail address. */
  account: string;
  savedAt: number;
  total: number;
  capped: boolean;
  failures: number;
  emails: Email[];
}

const CATEGORY_IDS = new Set<string>([
  "reply_needed",
  "interview",
  "calendar",
  "finance",
  "receipts",
  "newsletters",
  "social",
  "promotional",
  "spam",
]);

function isEmail(value: unknown): value is Email {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.subject === "string" &&
    typeof e.from === "string" &&
    typeof e.snippet === "string" &&
    typeof e.reason === "string" &&
    typeof e.day === "string" &&
    typeof e.confidence === "number" &&
    typeof e.category === "string" &&
    CATEGORY_IDS.has(e.category as CategoryId)
  );
}

/** localStorage is user-writable, so nothing read back here is trusted. */
function isStoredRun(value: unknown): value is StoredRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Record<string, unknown>;
  return (
    run.version === VERSION &&
    typeof run.account === "string" &&
    typeof run.savedAt === "number" &&
    typeof run.total === "number" &&
    Array.isArray(run.emails) &&
    run.emails.every(isEmail)
  );
}

export function loadRun(): StoredRun | null {
  // Private mode, disabled site data, and SSR all land here.
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredRun(parsed)) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(run: Omit<StoredRun, "version" | "savedAt">): boolean {
  try {
    const payload: StoredRun = { ...run, version: VERSION, savedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Quota exceeded or storage blocked; the run still works in memory.
    return false;
  }
}

export function clearRun(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do — there is no storage to clear.
  }
}

export function savedAgo(savedAt: number, now = Date.now()): string {
  const minutes = Math.floor((now - savedAt) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

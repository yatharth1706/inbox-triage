import { SEED_MESSAGES } from "./seed";
import type { Email, RangeDays } from "./types";

/** How many messages a window yields. */
const WINDOW_SIZES: Record<RangeDays, number> = { 30: 42, 60: 78, 90: 112 };

export const RANGE_OPTIONS: readonly RangeDays[] = [30, 60, 90];

export function messageCountFor(range: RangeDays): number {
  return WINDOW_SIZES[range];
}

/**
 * Fans the seed templates out across the window, giving each message a
 * spread-out age and a stable pseudo-random confidence in [0.71, 0.98].
 */
export function buildEmails(range: RangeDays): Email[] {
  const total = WINDOW_SIZES[range];
  return Array.from({ length: total }, (_, i) => {
    const seed = SEED_MESSAGES[i % SEED_MESSAGES.length];
    const day = Math.floor((i / total) * range) + 1;
    return {
      ...seed,
      id: i,
      day: day === 1 ? "1d ago" : `${day}d ago`,
      confidence: 0.71 + ((i * 37) % 28) / 100,
    };
  });
}

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function averageConfidence(emails: readonly Email[]): string {
  if (emails.length === 0) return "—";
  const sum = emails.reduce((acc, e) => acc + e.confidence, 0);
  return formatConfidence(sum / emails.length);
}

/** mm:ss cursor used by the run log. */
export function runTimestamp(index: number): string {
  const mm = String(Math.floor(index / 60)).padStart(2, "0");
  const ss = String(index % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

import type { CSSProperties } from "react";

/**
 * Per-category colour tints. These are genuinely dynamic (nine hues, each with
 * several alpha steps), so they stay as inline styles rather than utilities.
 * Layout, spacing and typography are Tailwind everywhere else.
 */

export function dotStyle(color: string): CSSProperties {
  return { background: color };
}

export function pillStyle(color: string): CSSProperties {
  return { background: `${color}1A`, color, borderColor: `${color}33` };
}

export function avatarStyle(color: string): CSSProperties {
  return { background: `${color}22`, color };
}

export function confidenceBarStyle(color: string, confidence: number): CSSProperties {
  return { width: `${Math.round(confidence * 100)}%`, background: color };
}

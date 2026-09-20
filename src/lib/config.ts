/**
 * Knobs the design exposes as component props. Kept as typed config rather than
 * on-screen controls, so a host app can override them at the provider.
 */
export interface TriageConfig {
  /** Drives the `--accent` custom property. */
  accent: string;
  /** Milliseconds between classification batches. */
  speed: number;
  showConfidence: boolean;
}

export const ACCENT_OPTIONS = ["#7CE3BC", "#B39CF5", "#F0C36F", "#6FB6F0"] as const;

export const SPEED_RANGE = { min: 30, max: 260, step: 5 } as const;

export const DEFAULT_CONFIG: TriageConfig = {
  accent: "#7CE3BC",
  speed: 95,
  showConfidence: true,
};

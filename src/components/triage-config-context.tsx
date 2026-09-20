"use client";

import { createContext, useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { DEFAULT_CONFIG, type TriageConfig } from "@/lib/config";

const TriageConfigContext = createContext<TriageConfig>(DEFAULT_CONFIG);

export function useTriageConfig(): TriageConfig {
  return useContext(TriageConfigContext);
}

export function TriageConfigProvider({
  children,
  ...overrides
}: Partial<TriageConfig> & { children: ReactNode }) {
  const { accent, speed, showConfidence, model } = overrides;
  // Explicit fallbacks: spreading the overrides would let an undefined prop
  // overwrite a default with undefined.
  const config = useMemo<TriageConfig>(
    () => ({
      accent: accent ?? DEFAULT_CONFIG.accent,
      speed: speed ?? DEFAULT_CONFIG.speed,
      showConfidence: showConfidence ?? DEFAULT_CONFIG.showConfidence,
      model: model ?? DEFAULT_CONFIG.model,
    }),
    [accent, speed, showConfidence, model],
  );

  return (
    <TriageConfigContext.Provider value={config}>
      <div style={{ "--accent": config.accent } as CSSProperties} className="contents">
        {children}
      </div>
    </TriageConfigContext.Provider>
  );
}

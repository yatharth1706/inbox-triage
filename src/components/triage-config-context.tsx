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
  const config = useMemo<TriageConfig>(
    () => ({ ...DEFAULT_CONFIG, ...overrides }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrides.accent, overrides.speed, overrides.showConfidence],
  );

  return (
    <TriageConfigContext.Provider value={config}>
      <div style={{ "--accent": config.accent } as CSSProperties} className="contents">
        {children}
      </div>
    </TriageConfigContext.Provider>
  );
}

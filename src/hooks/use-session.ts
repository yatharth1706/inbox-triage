"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionInfo {
  /** Whether the server has Gmail + JEV credentials at all. */
  configured: boolean;
  connected: boolean;
  email: string | null;
}

const UNKNOWN: SessionInfo = { configured: false, connected: false, email: null };

async function fetchSession(): Promise<SessionInfo> {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    return response.ok ? ((await response.json()) as SessionInfo) : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

export function useSession() {
  const [session, setSession] = useState<SessionInfo>(UNKNOWN);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchSession();
      if (!cancelled) setSession(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const disconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSession(await fetchSession());
  }, []);

  return { session, disconnect };
}

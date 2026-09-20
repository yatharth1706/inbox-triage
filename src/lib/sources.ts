import type { SourceKey } from "./types";

export interface SourceDef {
  key: SourceKey;
  title: string;
  body: string;
  meta: string;
  /** Shown next to the start button once this source is picked. */
  hint: string;
  cta: string;
}

export const SOURCES: readonly SourceDef[] = [
  {
    key: "gmail",
    title: "Connect Gmail",
    body: "Authorise read-only access and JEV pulls the window straight from your mailbox.",
    meta: "OAuth · gmail.readonly",
    hint: "Read-only. JEV never writes to your mailbox — sorting happens here, not in Gmail.",
    cta: "Connect Gmail & run JEV",
  },
  {
    key: "demo",
    title: "Demo inbox",
    body: "A sample mailbox of realistic messages. Nothing to connect.",
    meta: "no account needed",
    hint: "Sample data — good for seeing how the folders behave.",
    cta: "Run JEV on demo inbox",
  },
];

export function sourceByKey(key: SourceKey): SourceDef {
  return SOURCES.find((s) => s.key === key) ?? SOURCES[0];
}

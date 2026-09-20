import type { ReactNode } from "react";

export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "dim" | "accent";
}) {
  const color =
    tone === "accent" ? "text-accent" : tone === "dim" ? "text-dim" : "text-muted-strong";
  return (
    <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${color}`}>
      {children}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="flex w-full max-w-[1080px] items-center justify-between gap-4 border-b border-edge pb-5">
      <div className="flex items-center gap-[11px]">
        <div
          aria-hidden="true"
          className="flex size-[26px] animate-bob items-center justify-center rounded-lg bg-linear-[140deg,#7CE3BC,#4E9FE0] font-mono text-[11px] font-bold text-canvas"
        >
          J
        </div>
        <div className="text-[15px] font-semibold tracking-[-0.01em]">Inbox Triage</div>
      </div>
      <div className="flex items-center gap-[9px] font-mono text-[11px] text-muted-strong">
        <span
          aria-hidden="true"
          className="inline-block size-[6px] animate-blink rounded-full bg-accent"
        />
        <span>jev-2 · typesafe</span>
      </div>
    </header>
  );
}

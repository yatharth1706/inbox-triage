"use client";

import { useTriageRun } from "@/hooks/use-triage-run";
import { ConnectStep } from "./connect/connect-step";
import { DoneStep } from "./done/done-step";
import { RunningStep } from "./running/running-step";
import { SiteHeader } from "./site-header";
import { useTriageConfig } from "./triage-config-context";

export function TriageApp() {
  const { accent, speed, showConfidence } = useTriageConfig();
  const { state, actions, total, percent, current, pool, visible } = useTriageRun(speed);

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-[72px] pt-[26px] font-sans text-ink">
      <SiteHeader />

      {state.step === "connect" ? (
        <ConnectStep
          source={state.source}
          range={state.range}
          accent={accent}
          onSelectSource={actions.selectSource}
          onSelectRange={actions.selectRange}
          onStart={actions.start}
        />
      ) : null}

      {state.step === "running" ? (
        <RunningStep
          percent={percent}
          processed={state.processed}
          total={total}
          log={state.log}
          current={current}
          counts={state.counts}
          showConfidence={showConfidence}
        />
      ) : null}

      {state.step === "done" ? (
        <DoneStep
          emails={state.emails}
          counts={state.counts}
          pool={pool}
          visible={visible}
          selected={state.selected}
          openId={state.openId}
          pushed={state.pushed}
          total={total}
          showConfidence={showConfidence}
          onSelectFolder={actions.selectFolder}
          onToggleOpen={actions.toggleOpen}
          onMove={actions.move}
          onPush={actions.push}
          onReset={actions.reset}
        />
      ) : null}
    </main>
  );
}

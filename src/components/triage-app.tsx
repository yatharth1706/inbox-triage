"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useTriageRun } from "@/hooks/use-triage-run";
import { ConnectStep } from "./connect/connect-step";
import { DoneStep } from "./done/done-step";
import { RunningStep } from "./running/running-step";
import { SiteHeader } from "./site-header";
import { useTriageConfig } from "./triage-config-context";

const AUTH_ERRORS: Record<string, string> = {
  access_denied: "Google authorisation was cancelled.",
  state_mismatch: "That sign-in link expired. Please try connecting again.",
  missing_code: "Google did not return an authorisation code.",
  exchange_failed: "Could not exchange the Google authorisation code.",
};

export function TriageApp({ maxMessages }: { maxMessages: number }) {
  const { accent, speed, showConfidence, model } = useTriageConfig();
  const { session, disconnect } = useSession();
  const run = useTriageRun(speed, session.email);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authDismissed, setAuthDismissed] = useState(false);

  // Derived from the URL the OAuth callback redirected to — no effect needed.
  const authCode = searchParams.get("auth_error");
  const authError =
    authDismissed || !authCode
      ? null
      : (AUTH_ERRORS[authCode] ?? "Could not connect to Gmail.");

  const { state, actions, counts, processed, total, percent, current, pool, visible } = run;

  const startOrConnect = () => {
    if (state.source === "gmail" && !session.connected) {
      // A full navigation, not a client transition: the browser has to follow
      // Google's redirect chain, which the Next router cannot do.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/api/auth/google";
      return;
    }
    setAuthDismissed(true);
    if (searchParams.size > 0) router.replace("/", { scroll: false });
    actions.start();
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-[72px] pt-[26px] font-sans text-ink">
      <SiteHeader model={model} connected={session.connected} />

      {!state.hydrated ? null : state.step === "connect" ? (
        <ConnectStep
          source={state.source}
          range={state.range}
          accent={accent}
          session={session}
          error={authError ?? state.error}
          maxMessages={maxMessages}
          onSelectSource={actions.selectSource}
          onSelectRange={actions.selectRange}
          onStart={startOrConnect}
          onDisconnect={() => void disconnect()}
        />
      ) : null}

      {state.step === "running" ? (
        <RunningStep
          percent={percent}
          processed={processed}
          total={total}
          log={state.log}
          current={current}
          counts={counts}
          showConfidence={showConfidence}
        />
      ) : null}

      {state.step === "done" ? (
        <DoneStep
          classified={state.classified}
          counts={counts}
          pool={pool}
          visible={visible}
          selected={state.selected}
          openId={state.openId}
          total={total}
          showConfidence={showConfidence}
          bodies={state.bodies}
          loadingBody={state.loadingBody}
          capped={state.capped}
          failures={state.failures}
          error={state.error}
          onSelectFolder={actions.selectFolder}
          onToggleOpen={actions.toggleOpen}
          onMove={actions.move}
          onReset={actions.reset}
          onForget={actions.forget}
          account={state.account}
          savedAt={state.savedAt}
          persisted={state.persisted}
          connectedEmail={session.email}
        />
      ) : null}
    </main>
  );
}

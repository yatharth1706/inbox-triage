import { Suspense } from "react";
import { TriageApp } from "@/components/triage-app";
import { TriageConfigProvider } from "@/components/triage-config-context";
import { env } from "@/lib/server/env";

export default function Home() {
  return (
    <TriageConfigProvider model={env.typesafeModel}>
      <Suspense>
        <TriageApp maxMessages={env.maxMessages} />
      </Suspense>
    </TriageConfigProvider>
  );
}

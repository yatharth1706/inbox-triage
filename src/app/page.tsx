import { TriageApp } from "@/components/triage-app";
import { TriageConfigProvider } from "@/components/triage-config-context";

export default function Home() {
  return (
    <TriageConfigProvider>
      <TriageApp />
    </TriageConfigProvider>
  );
}

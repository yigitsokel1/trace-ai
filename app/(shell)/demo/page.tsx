import { DashboardHeader } from "@/components/dashboard-header";
import { DemoWorkflowPanel } from "@/components/demo-workflow-panel";
import { isGeminiLiveEnabled } from "@/lib/gemini-draft";

export default function DemoWorkflowPage() {
  const engineMode = isGeminiLiveEnabled() ? "live" : "demo";

  return (
    <>
      <DashboardHeader
        title="Demo Workflow"
        description="Run a controlled AI workflow and inspect execution traces, retrieval context, validation checks, and model metadata."
        engineMode={engineMode}
      />
      <DemoWorkflowPanel />
    </>
  );
}

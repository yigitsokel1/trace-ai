import { DashboardHeader } from "@/components/dashboard-header";
import { DemoWorkflowPanel } from "@/components/demo-workflow-panel";
import { isGeminiLiveEnabled } from "@/lib/gemini-draft";

export default function DemoWorkflowPage() {
  const engineMode = isGeminiLiveEnabled() ? "live" : "demo";

  return (
    <>
      <DashboardHeader
        title="Demo Workflow"
        description="Run the support reply pipeline with preset inputs and inspect the trace."
        engineMode={engineMode}
      />
      <DemoWorkflowPanel />
    </>
  );
}

import { DashboardHeader } from "@/components/dashboard-header";
import { DemoWorkflowPanel } from "@/components/demo-workflow-panel";

export default function DemoWorkflowPage() {
  return (
    <>
      <DashboardHeader
        title="Demo Workflow"
        description="Run the support reply pipeline with preset inputs and inspect the trace."
      />
      <DemoWorkflowPanel />
    </>
  );
}

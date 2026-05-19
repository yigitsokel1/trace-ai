import { isContextRetrievalStep } from "./pipeline-steps";
import { failureCodeFromStep, failureSeverityForRun } from "./workflow-step-metadata";
import type { TraceSummary, WorkflowRun, WorkflowStep } from "./types";

export function buildTraceSummary(
  steps: WorkflowStep[],
  run: WorkflowRun
): TraceSummary {
  const failedStep = steps.find((s) => s.status === "failed");
  const contextStep = steps.find((s) => isContextRetrievalStep(s.step_name));
  const draftStep = steps.find((s) => s.step_name === "AI Draft Generation");
  const retrievedDocs =
    contextStep?.metadata.retrieved_documents ??
    contextStep?.metadata.retrieved_docs ??
    [];
  const tokens = draftStep?.metadata.token_estimate;
  const totalTokens =
    tokens != null ? tokens.input + tokens.output : null;

  const failureReason =
    run.status === "failed" && failedStep
      ? failureCodeFromStep(failedStep)
      : null;

  return {
    status: run.status === "running" ? "success" : run.status,
    failedStep: failedStep?.step_name ?? null,
    totalLatencyMs: run.total_duration_ms,
    totalTokens,
    retrievedDocCount: retrievedDocs.length,
    model: draftStep?.metadata.model_info?.model ?? null,
    failureReason,
    failureSeverity: failureSeverityForRun(failedStep),
  };
}

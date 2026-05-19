import type { StepName } from "./types";

export const PIPELINE_STEP_NAMES: StepName[] = [
  "Input Validation",
  "Context Retrieval",
  "AI Draft Generation",
  "Response Validation",
  "Finalize Response",
];

/** Legacy DB rows may still use the old step label. */
export const LEGACY_CONTEXT_RETRIEVAL_STEP = "Policy Retrieval";

export function isContextRetrievalStep(stepName: string): boolean {
  return (
    stepName === "Context Retrieval" ||
    stepName === LEGACY_CONTEXT_RETRIEVAL_STEP
  );
}

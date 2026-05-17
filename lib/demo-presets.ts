import type { StepName, WorkflowPreset } from "./types";

export const PIPELINE_STEP_NAMES: StepName[] = [
  "Input Validation",
  "Policy Retrieval",
  "AI Draft Generation",
  "Response Validation",
  "Finalize Response",
];

export type DemoPreset = {
  id: WorkflowPreset;
  label: string;
  input: string;
};

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "refund",
    label: "Refund issue",
    input:
      "I was charged twice for my Pro subscription last month and need a refund. Invoice #INV-20481.",
  },
  {
    id: "billing",
    label: "Billing question",
    input:
      "Where can I download my invoice for March? I need it for expense reporting.",
  },
  {
    id: "login",
    label: "Login trouble",
    input:
      "I cannot sign in after enabling 2FA. My backup codes do not work.",
  },
  {
    id: "subscription",
    label: "Cancel subscription",
    input:
      "Please cancel my Team plan at the end of the billing cycle. We are downgrading to Pro.",
  },
];

export function getPresetById(id: WorkflowPreset): DemoPreset | undefined {
  return DEMO_PRESETS.find((p) => p.id === id);
}

import { PIPELINE_STEP_NAMES } from "./pipeline-steps";
import type { WorkflowPreset } from "./types";

export { PIPELINE_STEP_NAMES };

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

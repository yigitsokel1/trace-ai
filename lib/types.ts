export type RunStatus = "success" | "failed" | "running";
export type RunMode = "demo" | "live";

export type StepName =
  | "Input Validation"
  | "Policy Retrieval"
  | "AI Draft Generation"
  | "Response Validation"
  | "Finalize Response";

export type WorkflowPreset = "refund" | "billing" | "login" | "subscription";

export type WorkflowRunRequest = {
  input: string;
  preset?: WorkflowPreset;
};

export type WorkflowRunResponse = {
  run_id: string;
  status: Exclude<RunStatus, "running">;
  total_duration_ms: number;
  step_count: number;
  mode: RunMode;
};

export type WorkflowProgressEvent =
  | {
      type: "step_start";
      step_order: number;
      step_name: StepName;
    }
  | {
      type: "step_complete";
      step_order: number;
      step_name: StepName;
      status: Exclude<RunStatus, "running">;
      duration_ms: number;
    }
  | {
      type: "run_complete";
      run: WorkflowRunResponse;
    }
  | {
      type: "error";
      message: string;
    };

export type RetrievalResult = {
  retrieved_docs: string[];
  retrieval_scores: Record<string, number>;
  matched_keywords?: Record<string, string[]>;
  snippets?: Record<string, string>;
};

export type PolicyDocument = {
  doc_id: string;
  filename: string;
  content: string;
  tags: string[];
};

export type WorkflowRun = {
  run_id: string;
  workflow_type: string;
  status: RunStatus;
  total_duration_ms: number;
  step_count: number;
  created_at: Date;
  mode: RunMode;
};

export type DashboardStats = {
  total_runs: number;
  success_rate: number;
  avg_latency_ms: number;
};

export type DashboardData = {
  stats: DashboardStats;
  runs: WorkflowRun[];
};

export type RunDetail = {
  run: WorkflowRun;
  steps: WorkflowStep[];
};

export type StepMetadata = {
  retrieved_docs?: string[];
  retrieval_scores?: Record<string, number>;
  matched_keywords?: Record<string, string[]>;
  snippets?: Record<string, string>;
  model_info?: { model: string; provider: string };
  token_estimate?: { input: number; output: number };
  validation_checks?: string[];
};

export type WorkflowStep = {
  step_id: string;
  run_id: string;
  step_name: string;
  status: RunStatus;
  duration_ms: number;
  input_preview: string | null;
  output_preview: string | null;
  metadata: StepMetadata;
  error_message: string | null;
  step_order: number;
};

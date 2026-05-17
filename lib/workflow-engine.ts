import { randomUUID } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  RunStatus,
  StepMetadata,
  StepName,
  WorkflowPreset,
  WorkflowRunResponse,
} from "./types";
import { retrievePolicyDocuments } from "./retrieval";
import {
  insertRunRunning,
  insertStepRunning,
  updateRunFinal,
  updateStepFinal,
} from "./workflow-db";

type Sql = NeonQueryFunction<false, false>;

const STEP_PIPELINE: StepName[] = [
  "Input Validation",
  "Policy Retrieval",
  "AI Draft Generation",
  "Response Validation",
  "Finalize Response",
];

type PipelineContext = {
  input: string;
  preset?: WorkflowPreset;
  retrievedDocs: string[];
  retrievalScores: Record<string, number>;
  draft: string;
};

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function buildDraft(
  input: string,
  preset: WorkflowPreset | undefined,
  retrievedDocs: string[]
): string {
  const lower = input.toLowerCase();
  const cite = (id: string) => retrievedDocs.includes(id) ? id : retrievedDocs[0];

  if (
    preset === "refund" ||
    lower.includes("refund") ||
    lower.includes("charge") ||
    lower.includes("charged")
  ) {
    const doc = cite("refund_policy");
    return `Thank you for contacting us. Per ${doc}, duplicate charges are reviewed within one business day when you provide your invoice ID. I've outlined the refund eligibility steps below.`;
  }
  if (
    preset === "billing" ||
    lower.includes("invoice") ||
    lower.includes("download")
  ) {
    const doc = cite("billing_faq");
    return `You can download invoices from Settings → Billing → Invoices (${doc}). I've included steps to export your March receipt for expense reporting.`;
  }
  if (
    preset === "login" ||
    lower.includes("login") ||
    lower.includes("2fa") ||
    lower.includes("password")
  ) {
    const doc = cite("login_help");
    return `Sorry you're locked out. Per ${doc}, use Forgot password or verify 2FA backup codes. I've listed recovery options for your account.`;
  }
  if (
    preset === "subscription" ||
    lower.includes("cancel") ||
    lower.includes("subscription")
  ) {
    const doc = cite("subscription_terms");
    return `Per ${doc}, your Team plan can be canceled at period end without immediate loss of access. I've summarized the downgrade timeline below.`;
  }

  const doc = retrievedDocs[0] ?? "billing_faq";
  return `Thank you for reaching out. Based on ${doc} and your message, we can help with your request. I've outlined the next steps below.`;
}

function shouldFailValidation(input: string, draft: string, retrievedDocs: string[]): {
  failed: boolean;
  errorMessage: string | null;
} {
  const lower = input.toLowerCase();
  const hasCitation = retrievedDocs.some((id) => draft.includes(id));
  const aggressiveRefund =
    lower.includes("six months") &&
    lower.includes("refund") &&
    (lower.includes("today") || lower.includes("money back"));

  if (aggressiveRefund && !hasCitation) {
    return {
      failed: true,
      errorMessage:
        "Draft missing required policy citation for billing disputes.",
    };
  }

  if (!hasCitation) {
    return {
      failed: true,
      errorMessage: "Draft missing required policy citation for billing disputes.",
    };
  }

  return { failed: false, errorMessage: null };
}

function estimateTokens(input: string, draft: string) {
  return {
    input: Math.max(120, Math.round(input.length * 1.4)),
    output: Math.max(80, Math.round(draft.length * 0.9)),
  };
}

type StepResult = {
  status: Exclude<RunStatus, "running">;
  durationMs: number;
  inputPreview: string | null;
  outputPreview: string | null;
  metadata: StepMetadata;
  errorMessage: string | null;
  stopPipeline: boolean;
};

async function executeStep(
  sql: Sql,
  stepName: StepName,
  ctx: PipelineContext
): Promise<StepResult> {
  switch (stepName) {
    case "Input Validation": {
      return {
        status: "success",
        durationMs: randomBetween(80, 120),
        inputPreview: ctx.input.slice(0, 120),
        outputPreview: "Input valid — 1 issue category detected",
        metadata: { validation_checks: ["length_ok", "category_detected"] },
        errorMessage: null,
        stopPipeline: false,
      };
    }
    case "Policy Retrieval": {
      const { retrieved_docs, retrieval_scores } = await retrievePolicyDocuments(
        sql,
        ctx.input,
        { preset: ctx.preset }
      );
      ctx.retrievedDocs = retrieved_docs;
      ctx.retrievalScores = retrieval_scores;
      return {
        status: "success",
        durationMs: randomBetween(120, 250),
        inputPreview: ctx.input.slice(0, 80),
        outputPreview: `Retrieved ${retrieved_docs.length} documents`,
        metadata: {
          retrieved_docs,
          retrieval_scores,
        },
        errorMessage: null,
        stopPipeline: false,
      };
    }
    case "AI Draft Generation": {
      const lower = ctx.input.toLowerCase();
      const aggressiveRefund =
        lower.includes("six months") &&
        lower.includes("refund") &&
        (lower.includes("today") || lower.includes("money back"));
      ctx.draft = aggressiveRefund
        ? "We understand you want a refund. Our team will review your account shortly."
        : buildDraft(ctx.input, ctx.preset, ctx.retrievedDocs);
      return {
        status: "success",
        durationMs: randomBetween(900, 1600),
        inputPreview: "Context: policy excerpts + user message",
        outputPreview: ctx.draft.slice(0, 160),
        metadata: {
          model_info: { model: "demo-engine-v1", provider: "deterministic" },
          token_estimate: estimateTokens(ctx.input, ctx.draft),
        },
        errorMessage: null,
        stopPipeline: false,
      };
    }
    case "Response Validation": {
      const { failed, errorMessage } = shouldFailValidation(
        ctx.input,
        ctx.draft,
        ctx.retrievedDocs
      );
      return {
        status: failed ? "failed" : "success",
        durationMs: randomBetween(90, 130),
        inputPreview: ctx.draft.slice(0, 100),
        outputPreview: failed ? null : "Draft passed safety and tone checks",
        metadata: {
          validation_checks: failed
            ? ["tone_ok", "policy_citation_missing"]
            : ["tone_ok", "policy_cited", "no_pii_leak"],
        },
        errorMessage,
        stopPipeline: failed,
      };
    }
    case "Finalize Response": {
      return {
        status: "success",
        durationMs: randomBetween(60, 90),
        inputPreview: null,
        outputPreview: "Response queued for support review",
        metadata: { validation_checks: ["queued"] },
        errorMessage: null,
        stopPipeline: false,
      };
    }
  }
}

export async function runSupportWorkflow(
  sql: Sql,
  input: string,
  preset?: WorkflowPreset
): Promise<WorkflowRunResponse> {
  const runId = `run_${randomUUID()}`;
  const ctx: PipelineContext = {
    input,
    preset,
    retrievedDocs: [],
    retrievalScores: {},
    draft: "",
  };

  await insertRunRunning(sql, runId);

  let totalDurationMs = 0;
  let completedSteps = 0;
  let runStatus: Exclude<RunStatus, "running"> = "success";

  for (let i = 0; i < STEP_PIPELINE.length; i++) {
    const stepName = STEP_PIPELINE[i]!;
    const stepOrder = i + 1;

    const stepId = await insertStepRunning(sql, runId, stepOrder, stepName);
    const result = await executeStep(sql, stepName, ctx);

    await updateStepFinal(sql, {
      stepId,
      status: result.status,
      durationMs: result.durationMs,
      inputPreview: result.inputPreview,
      outputPreview: result.outputPreview,
      metadata: result.metadata,
      errorMessage: result.errorMessage,
    });

    totalDurationMs += result.durationMs;
    completedSteps += 1;

    if (result.stopPipeline) {
      runStatus = "failed";
      break;
    }
  }

  await updateRunFinal(sql, runId, runStatus, totalDurationMs, completedSteps);

  return {
    run_id: runId,
    status: runStatus,
    total_duration_ms: totalDurationMs,
    step_count: completedSteps,
  };
}

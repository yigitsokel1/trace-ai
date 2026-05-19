import { randomUUID } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  RunMode,
  RunStatus,
  StepMetadata,
  StepName,
  WorkflowPreset,
  WorkflowProgressEvent,
  WorkflowRunResponse,
} from "./types";
import { buildAiDraftInputPreview } from "./ai-draft-preview";
import {
  formatGeminiErrorMessage,
  generateSupportDraft,
  isGeminiLiveEnabled,
  isGeminiRetryableError,
} from "./gemini-draft";
import { getPolicyContentsByIds } from "./policy-content";
import { retrievePolicyDocuments } from "./retrieval";
import { PIPELINE_STEP_NAMES } from "./pipeline-steps";
import {
  buildContextRetrievalStepMetadata,
  buildGenerationAttempts,
  buildInputValidationMetadata,
  buildResponseValidationMetadata,
} from "./workflow-step-metadata";
import {
  insertRunRunning,
  insertStepRunning,
  updateRunFinal,
  updateStepFinal,
} from "./workflow-db";

type Sql = NeonQueryFunction<false, false>;

const STEP_PIPELINE: StepName[] = PIPELINE_STEP_NAMES;

type PipelineContext = {
  input: string;
  preset?: WorkflowPreset;
  retrievedDocs: string[];
  retrievalScores: Record<string, number>;
  draft: string;
  rateLimited?: boolean;
};

export type RunSupportWorkflowOptions = {
  clientIp?: string | null;
  rateLimited?: boolean;
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
  ctx: PipelineContext,
  mode: RunMode
): Promise<StepResult> {
  switch (stepName) {
    case "Input Validation": {
      return {
        status: "success",
        durationMs: randomBetween(80, 120),
        inputPreview: ctx.input.slice(0, 120),
        outputPreview: "Input valid — 1 issue category detected",
        metadata: buildInputValidationMetadata(ctx.input, ctx.preset),
        errorMessage: null,
        stopPipeline: false,
      };
    }
    case "Context Retrieval": {
      const retrieval = await retrievePolicyDocuments(sql, ctx.input, {
        preset: ctx.preset,
      });
      ctx.retrievedDocs = retrieval.retrieved_docs;
      ctx.retrievalScores = retrieval.retrieval_scores;
      return {
        status: "success",
        durationMs: randomBetween(120, 250),
        inputPreview: ctx.input.slice(0, 80),
        outputPreview: `Retrieved ${retrieval.retrieved_docs.length} documents`,
        metadata: buildContextRetrievalStepMetadata(retrieval),
        errorMessage: null,
        stopPipeline: false,
      };
    }
    case "AI Draft Generation": {
      const inputPreview = buildAiDraftInputPreview(
        ctx.retrievedDocs,
        ctx.input
      );

      if (mode === "live") {
        const startedAt = Date.now();
        try {
          const excerpts = await getPolicyContentsByIds(sql, ctx.retrievedDocs);
          const result = await generateSupportDraft({
            input: ctx.input,
            excerpts,
            preset: ctx.preset,
          });
          ctx.draft = result.draft;
          const modelFallback = result.validation_checks?.includes(
            "gemini_model_fallback"
          );
          return {
            status: "success",
            durationMs: result.durationMs,
            inputPreview,
            outputPreview: ctx.draft.slice(0, 160),
            metadata: {
              model_info: result.modelInfo,
              token_estimate: result.tokenEstimate,
              ...(modelFallback
                ? buildGenerationAttempts([
                    {
                      attempt: 1,
                      outcome: "timeout",
                      detail: "primary model",
                    },
                    {
                      attempt: 2,
                      outcome: "success",
                      detail: result.modelInfo.model,
                    },
                  ])
                : buildGenerationAttempts([
                    { attempt: 1, outcome: "success" },
                  ])),
              ...(result.validation_checks?.length
                ? { validation_checks: result.validation_checks }
                : {}),
            },
            errorMessage: null,
            stopPipeline: false,
          };
        } catch (e) {
          if (isGeminiRetryableError(e)) {
            ctx.draft = buildDraft(ctx.input, ctx.preset, ctx.retrievedDocs);
            return {
              status: "success",
              durationMs: Date.now() - startedAt,
              inputPreview,
              outputPreview: ctx.draft.slice(0, 160),
              metadata: {
                model_info: {
                  model: "demo-engine-v1",
                  provider: "deterministic",
                },
                token_estimate: estimateTokens(ctx.input, ctx.draft),
                validation_checks: ["gemini_quota_fallback"],
                ...buildGenerationAttempts([
                  {
                    attempt: 1,
                    outcome: "timeout",
                    detail: "gemini_quota",
                  },
                  {
                    attempt: 2,
                    outcome: "fallback",
                    detail: "demo-engine-v1",
                  },
                ]),
              },
              errorMessage: null,
              stopPipeline: false,
            };
          }

          return {
            status: "failed",
            durationMs: Date.now() - startedAt,
            inputPreview,
            outputPreview: null,
            metadata: {
              ...buildGenerationAttempts([
                { attempt: 1, outcome: "error", detail: "gemini_api" },
              ]),
              failure_severity: "critical",
            },
            errorMessage: formatGeminiErrorMessage(e),
            stopPipeline: true,
          };
        }
      }

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
        inputPreview,
        outputPreview: ctx.draft.slice(0, 160),
        metadata: {
          model_info: { model: "demo-engine-v1", provider: "deterministic" },
          token_estimate: estimateTokens(ctx.input, ctx.draft),
          ...buildGenerationAttempts([{ attempt: 1, outcome: "success" }]),
          ...(ctx.rateLimited
            ? { validation_checks: ["rate_limit_fallback"] as string[] }
            : {}),
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
        metadata: buildResponseValidationMetadata(failed),
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
  preset?: WorkflowPreset,
  onProgress?: (event: WorkflowProgressEvent) => void,
  options: RunSupportWorkflowOptions = {}
): Promise<WorkflowRunResponse> {
  const rateLimited = options.rateLimited ?? false;
  const runId = `run_${randomUUID()}`;
  const ctx: PipelineContext = {
    input,
    preset,
    retrievedDocs: [],
    retrievalScores: {},
    draft: "",
    rateLimited,
  };

  const mode: RunMode = rateLimited
    ? "demo"
    : isGeminiLiveEnabled()
      ? "live"
      : "demo";
  await insertRunRunning(sql, runId, mode, options.clientIp ?? null);

  let totalDurationMs = 0;
  let completedSteps = 0;
  let runStatus: Exclude<RunStatus, "running"> = "success";

  for (let i = 0; i < STEP_PIPELINE.length; i++) {
    const stepName = STEP_PIPELINE[i]!;
    const stepOrder = i + 1;

    onProgress?.({
      type: "step_start",
      step_order: stepOrder,
      step_name: stepName,
    });

    const stepId = await insertStepRunning(sql, runId, stepOrder, stepName);
    const result = await executeStep(sql, stepName, ctx, mode);

    await updateStepFinal(sql, {
      stepId,
      status: result.status,
      durationMs: result.durationMs,
      inputPreview: result.inputPreview,
      outputPreview: result.outputPreview,
      metadata: result.metadata,
      errorMessage: result.errorMessage,
    });

    onProgress?.({
      type: "step_complete",
      step_order: stepOrder,
      step_name: stepName,
      status: result.status,
      duration_ms: result.durationMs,
    });

    totalDurationMs += result.durationMs;
    completedSteps += 1;

    if (result.stopPipeline) {
      runStatus = "failed";
      break;
    }
  }

  await updateRunFinal(sql, runId, runStatus, totalDurationMs, completedSteps);

  const response: WorkflowRunResponse = {
    run_id: runId,
    status: runStatus,
    total_duration_ms: totalDurationMs,
    step_count: completedSteps,
    mode,
  };

  onProgress?.({ type: "run_complete", run: response });

  return response;
}

import { GoogleGenerativeAI } from "@google/generative-ai";

import type { PolicyExcerpt } from "@/lib/policy-content";
import type { WorkflowPreset } from "@/lib/types";

/** Free-tier friendly default; override with GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-2.5-flash";

/** Used when primary model fails (503, quota, etc.); override with GEMINI_MODEL_FALLBACK. */
const DEFAULT_FALLBACK_MODEL = "gemini-2.5-flash-lite";

export function isGeminiLiveEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isGeminiQuotaOrRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    /quota exceeded/i.test(message)
  );
}

/** Primary failed — try GEMINI_MODEL_FALLBACK before giving up. */
export function isGeminiRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    isGeminiQuotaOrRateLimitError(error) ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("404") ||
    /service unavailable/i.test(message) ||
    /high demand/i.test(message) ||
    /temporarily unavailable/i.test(message) ||
    /no longer available/i.test(message)
  );
}

export function getGeminiModelCandidates(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallback =
    process.env.GEMINI_MODEL_FALLBACK?.trim() || DEFAULT_FALLBACK_MODEL;
  return [...new Set([primary, fallback])];
}

export function formatGeminiErrorMessage(error: unknown): string {
  if (isGeminiQuotaOrRateLimitError(error)) {
    return "Gemini API quota exceeded. Set GEMINI_MODEL (e.g. gemini-2.5-flash) or enable billing.";
  }
  const message =
    error instanceof Error ? error.message : "Gemini draft generation failed";
  return message.length > 320 ? `${message.slice(0, 320)}…` : message;
}


function buildPrompt(
  input: string,
  excerpts: PolicyExcerpt[],
  preset?: WorkflowPreset
): string {
  const policyBlock = excerpts
    .map((e) => `[${e.doc_id}]\n${e.content}`)
    .join("\n\n");

  const presetHint = preset ? `Workflow preset: ${preset}.` : "";

  return `You are a customer support agent drafting a reply.

${presetHint}

User message:
"""
${input}
"""

Policy documents (cite at least one doc_id exactly as shown in brackets, e.g. refund_policy):
${policyBlock || "(no policy excerpts loaded)"}

Write a professional support reply in 2–4 sentences. You MUST include at least one policy doc_id from the list above verbatim in your reply. Do not invent policy IDs.`;
}

function extractUsageTokens(
  usage:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined,
  input: string,
  draft: string
): { input: number; output: number } {
  if (
    usage?.promptTokenCount != null &&
    usage?.candidatesTokenCount != null
  ) {
    return {
      input: usage.promptTokenCount,
      output: usage.candidatesTokenCount,
    };
  }

  return {
    input: Math.max(120, Math.round(input.length * 1.4)),
    output: Math.max(80, Math.round(draft.length * 0.9)),
  };
}

export type GenerateSupportDraftParams = {
  input: string;
  excerpts: PolicyExcerpt[];
  preset?: WorkflowPreset;
};

export type GenerateSupportDraftResult = {
  draft: string;
  durationMs: number;
  modelInfo: { model: string; provider: "google" };
  tokenEstimate: { input: number; output: number };
  validation_checks?: string[];
};

async function generateWithModel(
  client: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  input: string
): Promise<Omit<GenerateSupportDraftResult, "durationMs" | "validation_checks">> {
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const draft = result.response.text()?.trim();

  if (!draft) {
    throw new Error("Gemini returned an empty draft");
  }

  const usage = result.response.usageMetadata;

  return {
    draft,
    modelInfo: { model: modelName, provider: "google" },
    tokenEstimate: extractUsageTokens(
      usage
        ? {
            promptTokenCount: usage.promptTokenCount,
            candidatesTokenCount: usage.candidatesTokenCount,
            totalTokenCount: usage.totalTokenCount,
          }
        : undefined,
      input,
      draft
    ),
  };
}

export async function generateSupportDraft(
  params: GenerateSupportDraftParams
): Promise<GenerateSupportDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const candidates = getGeminiModelCandidates();
  const prompt = buildPrompt(params.input, params.excerpts, params.preset);
  const startedAt = Date.now();
  const client = new GoogleGenerativeAI(apiKey);

  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const modelName = candidates[i]!;
    try {
      const partial = await generateWithModel(
        client,
        modelName,
        prompt,
        params.input
      );
      return {
        ...partial,
        durationMs: Date.now() - startedAt,
        ...(i > 0 ? { validation_checks: ["gemini_model_fallback"] } : {}),
      };
    } catch (e) {
      lastError = e;
      const hasAnotherModel = i < candidates.length - 1;
      if (hasAnotherModel && isGeminiRetryableError(e)) {
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error("Gemini draft generation failed");
}

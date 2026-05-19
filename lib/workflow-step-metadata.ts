import type {
  FailureSeverity,
  GenerationAttempt,
  StepMetadata,
  WorkflowPreset,
} from "./types";

const RESPONSE_REQUIRED_CHECKS = [
  "tone_ok",
  "policy_cited",
  "no_pii_leak",
] as const;

const VALIDATION_POLICY = "support_reply_v1";

export function detectIntent(
  input: string,
  preset?: WorkflowPreset
): string {
  if (preset) return preset;
  const lower = input.toLowerCase();
  if (
    lower.includes("refund") ||
    lower.includes("charge") ||
    lower.includes("charged")
  ) {
    return "refund";
  }
  if (lower.includes("invoice") || lower.includes("download")) {
    return "billing";
  }
  if (
    lower.includes("login") ||
    lower.includes("2fa") ||
    lower.includes("password")
  ) {
    return "login";
  }
  if (lower.includes("cancel") || lower.includes("subscription")) {
    return "subscription";
  }
  return "general";
}

export function detectRiskFlags(input: string): string[] {
  const lower = input.toLowerCase();
  const flags: string[] = [];
  const aggressiveRefund =
    lower.includes("six months") &&
    lower.includes("refund") &&
    (lower.includes("today") || lower.includes("money back"));
  if (aggressiveRefund) {
    flags.push("aggressive_refund_request");
  }
  if (lower.includes("urgent") || lower.includes("immediately")) {
    flags.push("urgency_language");
  }
  return flags;
}

export function normalizeInputPreview(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function buildInputValidationMetadata(
  input: string,
  preset?: WorkflowPreset
): StepMetadata {
  return {
    validation_checks: ["length_ok", "category_detected"],
    detected_intent: detectIntent(input, preset),
    message_length: input.length,
    normalized_input: normalizeInputPreview(input),
    risk_flags: detectRiskFlags(input),
  };
}

export function similarityScoreFromScores(
  scores: Record<string, number>
): number | undefined {
  const values = Object.values(scores);
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function flattenMatchedKeywords(
  matched?: Record<string, string[]>
): string[] | undefined {
  if (!matched) return undefined;
  const flat = [...new Set(Object.values(matched).flat())];
  return flat.length > 0 ? flat : undefined;
}

export function buildContextRetrievalStepMetadata(
  retrieval: {
    retrieved_docs: string[];
    retrieval_scores: Record<string, number>;
    matched_keywords?: Record<string, string[]>;
    snippets?: Record<string, string>;
    fallback_used?: boolean;
  }
): StepMetadata {
  const matched_keywords_flat = flattenMatchedKeywords(
    retrieval.matched_keywords
  );
  return {
    retrieved_docs: retrieval.retrieved_docs,
    retrieved_documents: retrieval.retrieved_docs,
    retrieval_scores: retrieval.retrieval_scores,
    matched_keywords: retrieval.matched_keywords,
    matched_keywords_flat,
    snippets: retrieval.snippets,
    retrieval_strategy: "keyword_tag_match",
    similarity_score: similarityScoreFromScores(retrieval.retrieval_scores),
    fallback_used: retrieval.fallback_used ?? false,
  };
}

export function buildResponseValidationMetadata(
  failed: boolean
): StepMetadata {
  const required_checks = [...RESPONSE_REQUIRED_CHECKS];
  if (failed) {
    return {
      validation_checks: ["tone_ok", "policy_citation_missing"],
      validation_policy: VALIDATION_POLICY,
      required_checks,
      passed_checks: ["tone_ok"],
      failed_checks: ["policy_citation_missing"],
      failure_severity: "warning",
    };
  }
  return {
    validation_checks: ["tone_ok", "policy_cited", "no_pii_leak"],
    validation_policy: VALIDATION_POLICY,
    required_checks,
    passed_checks: [...required_checks],
    failed_checks: [],
  };
}

export function failureCodeFromStep(step: {
  metadata: StepMetadata;
  error_message: string | null;
}): string | null {
  const code = step.metadata.failed_checks?.[0];
  if (code) return code;
  if (step.error_message) return "validation_error";
  return null;
}

export function failureSeverityForRun(
  failedStep: { metadata: StepMetadata; step_name: string } | undefined
): FailureSeverity | null {
  if (!failedStep) return null;
  if (failedStep.metadata.failure_severity) {
    return failedStep.metadata.failure_severity;
  }
  if (failedStep.step_name === "AI Draft Generation") {
    return "critical";
  }
  if (failedStep.step_name === "Response Validation") {
    return "warning";
  }
  return "recoverable";
}

export function buildGenerationAttempts(
  attempts: GenerationAttempt[]
): Pick<StepMetadata, "generation_attempts"> {
  return { generation_attempts: attempts };
}

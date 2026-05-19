import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { buildAiDraftInputPreview } from "./ai-draft-preview";
import { pickRetrievalEnrichment, retrievePolicyDocuments } from "./retrieval";
import type { RunStatus, StepMetadata } from "./types";
import {
  buildContextRetrievalStepMetadata,
  buildGenerationAttempts,
  buildInputValidationMetadata,
  buildResponseValidationMetadata,
} from "./workflow-step-metadata";

const SEED_DOC_DEFS = [
  {
    doc_id: "refund_policy",
    filename: "refund_policy.md",
    tags: ["refund", "chargeback", "billing"],
  },
  {
    doc_id: "billing_faq",
    filename: "billing_faq.md",
    tags: ["invoice", "payment", "billing"],
  },
  {
    doc_id: "subscription_terms",
    filename: "subscription_terms.md",
    tags: ["cancel", "plan", "subscription"],
  },
  {
    doc_id: "login_help",
    filename: "login_help.md",
    tags: ["login", "password", "2fa"],
  },
] as const;

type StepName =
  | "Input Validation"
  | "Context Retrieval"
  | "AI Draft Generation"
  | "Response Validation"
  | "Finalize Response";

type SuccessDurations = [number, number, number, number, number];
type FailedDurations = [number, number, number, number];

const DEFAULT_SUCCESS_DURATIONS: SuccessDurations = [95, 185, 1240, 110, 75];
const DEFAULT_FAILED_DURATIONS: FailedDurations = [92, 210, 1380, 98];

type SeedStep = {
  step_id: string;
  step_name: StepName;
  status: RunStatus;
  duration_ms: number;
  input_preview: string | null;
  output_preview: string | null;
  metadata: StepMetadata;
  error_message: string | null;
  step_order: number;
};

type SeedRun = {
  run_id: string;
  status: RunStatus;
  created_at: Date;
  steps: SeedStep[];
};

type SeedRunDef = {
  run_id: string;
  status: "success" | "failed";
  daysAgo: number;
  hoursAgo?: number;
  input: string;
  retrieved_docs: string[];
  retrieval_scores: Record<string, number>;
  durations: SuccessDurations | FailedDurations;
};

const SEED_RUN_DEFS: SeedRunDef[] = [
  {
    run_id: "run_seed_refund",
    status: "success",
    daysAgo: 0,
    hoursAgo: 6,
    input:
      "I was charged twice for my Pro subscription last month and need a refund. Invoice #INV-20481.",
    retrieved_docs: ["refund_policy", "billing_faq"],
    retrieval_scores: { refund_policy: 0.92, billing_faq: 0.71 },
    durations: [88, 165, 1180, 105, 72],
  },
  {
    run_id: "run_seed_upgrade",
    status: "success",
    daysAgo: 1,
    hoursAgo: 4,
    input:
      "We want to upgrade from Pro to Team before our renewal next week. What changes on billing?",
    retrieved_docs: ["subscription_terms", "billing_faq"],
    retrieval_scores: { subscription_terms: 0.87, billing_faq: 0.62 },
    durations: [99, 205, 1580, 92, 74],
  },
  {
    run_id: "run_seed_billing",
    status: "success",
    daysAgo: 1,
    hoursAgo: 14,
    input:
      "Where can I download my invoice for March? I need it for expense reporting.",
    retrieved_docs: ["billing_faq"],
    retrieval_scores: { billing_faq: 0.88 },
    durations: [102, 220, 1420, 95, 68],
  },
  {
    run_id: "run_seed_password",
    status: "success",
    daysAgo: 3,
    hoursAgo: 8,
    input:
      "I forgot my password and no longer have access to my authenticator app. How do I reset access?",
    retrieved_docs: ["login_help"],
    retrieval_scores: { login_help: 0.91 },
    durations: [85, 132, 890, 125, 65],
  },
  {
    run_id: "run_seed_login",
    status: "success",
    daysAgo: 4,
    hoursAgo: 6,
    input:
      "I cannot sign in after enabling 2FA. My backup codes do not work.",
    retrieved_docs: ["login_help"],
    retrieval_scores: { login_help: 0.94 },
    durations: [76, 140, 980, 118, 80],
  },
  {
    run_id: "run_seed_invoice",
    status: "success",
    daysAgo: 5,
    hoursAgo: 10,
    input:
      "Please send me a PDF of all Q4 invoices for our workspace. Finance needs them by Friday.",
    retrieved_docs: ["billing_faq"],
    retrieval_scores: { billing_faq: 0.85 },
    durations: [94, 178, 1050, 112, 70],
  },
  {
    run_id: "run_seed_subscription",
    status: "success",
    daysAgo: 5,
    hoursAgo: 20,
    input:
      "Please cancel my Team plan at the end of the billing cycle. We are downgrading to Pro.",
    retrieved_docs: ["subscription_terms", "billing_faq"],
    retrieval_scores: { subscription_terms: 0.9, billing_faq: 0.55 },
    durations: [110, 195, 1310, 88, 77],
  },
  {
    run_id: "run_seed_failed",
    status: "failed",
    daysAgo: 7,
    hoursAgo: 2,
    input:
      "Your refund policy is unclear. I want money back today for a charge from six months ago.",
    retrieved_docs: ["refund_policy"],
    retrieval_scores: { refund_policy: 0.67 },
    durations: [98, 245, 1510, 102],
  },
];

function readPolicyDoc(filename: string): string {
  return readFileSync(join(process.cwd(), "seed_docs", filename), "utf8");
}

function seedCreatedAt(now: number, daysAgo: number, hoursAgo = 0): Date {
  return new Date(
    now - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000
  );
}

export async function clearSeedData(sql: NeonQueryFunction<false, false>) {
  await sql`DELETE FROM workflow_steps`;
  await sql`DELETE FROM workflow_runs`;
  await sql`DELETE FROM policy_documents`;
}

function step(
  runId: string,
  order: number,
  partial: Omit<SeedStep, "step_id" | "step_order">
): SeedStep {
  return {
    step_id: `step_${runId}_${order}`,
    step_order: order,
    ...partial,
  };
}

function buildContextRetrievalMetadata(
  retrieved_docs: string[],
  retrieval_scores: Record<string, number>,
  enrichment?: { matched_keywords?: Record<string, string[]>; snippets?: Record<string, string> }
): StepMetadata {
  return buildContextRetrievalStepMetadata({
    retrieved_docs,
    retrieval_scores,
    matched_keywords: enrichment?.matched_keywords,
    snippets: enrichment?.snippets,
    fallback_used: false,
  });
}

function buildSuccessSteps(
  runId: string,
  inputPreview: string,
  retrieved_docs: string[],
  retrieval_scores: Record<string, number>,
  durations: SuccessDurations = DEFAULT_SUCCESS_DURATIONS,
  retrievalEnrichment?: {
    matched_keywords?: Record<string, string[]>;
    snippets?: Record<string, string>;
  }
): SeedStep[] {
  const [d1, d2, d3, d4, d5] = durations;
  const draft =
    "Thank you for reaching out. Based on our policy documents, we can help with your request. I've outlined the next steps and timeline below.";

  return [
    step(runId, 1, {
      step_name: "Input Validation",
      status: "success",
      duration_ms: d1,
      input_preview: inputPreview.slice(0, 120),
      output_preview: "Input valid — 1 issue category detected",
      metadata: buildInputValidationMetadata(inputPreview),
      error_message: null,
    }),
    step(runId, 2, {
      step_name: "Context Retrieval",
      status: "success",
      duration_ms: d2,
      input_preview: inputPreview.slice(0, 80),
      output_preview: `Retrieved ${retrieved_docs.length} documents`,
      metadata: buildContextRetrievalMetadata(
        retrieved_docs,
        retrieval_scores,
        retrievalEnrichment
      ),
      error_message: null,
    }),
    step(runId, 3, {
      step_name: "AI Draft Generation",
      status: "success",
      duration_ms: d3,
      input_preview: buildAiDraftInputPreview(retrieved_docs, inputPreview),
      output_preview: draft.slice(0, 160),
      metadata: {
        model_info: { model: "demo-engine-v1", provider: "deterministic" },
        token_estimate: { input: 412, output: 186 },
        ...buildGenerationAttempts([{ attempt: 1, outcome: "success" }]),
      },
      error_message: null,
    }),
    step(runId, 4, {
      step_name: "Response Validation",
      status: "success",
      duration_ms: d4,
      input_preview: draft.slice(0, 100),
      output_preview: "Draft passed safety and tone checks",
      metadata: buildResponseValidationMetadata(false),
      error_message: null,
    }),
    step(runId, 5, {
      step_name: "Finalize Response",
      status: "success",
      duration_ms: d5,
      input_preview: null,
      output_preview: "Response queued for support review",
      metadata: { validation_checks: ["queued"] },
      error_message: null,
    }),
  ];
}

function buildFailedSteps(
  runId: string,
  inputPreview: string,
  retrieved_docs: string[],
  retrieval_scores: Record<string, number>,
  durations: FailedDurations = DEFAULT_FAILED_DURATIONS,
  retrievalEnrichment?: {
    matched_keywords?: Record<string, string[]>;
    snippets?: Record<string, string>;
  }
): SeedStep[] {
  const [d1, d2, d3, d4] = durations;
  const draft =
    "We understand you want a refund. Our team will review your account shortly.";

  return [
    step(runId, 1, {
      step_name: "Input Validation",
      status: "success",
      duration_ms: d1,
      input_preview: inputPreview.slice(0, 120),
      output_preview: "Input valid — refund category detected",
      metadata: buildInputValidationMetadata(inputPreview),
      error_message: null,
    }),
    step(runId, 2, {
      step_name: "Context Retrieval",
      status: "success",
      duration_ms: d2,
      input_preview: inputPreview.slice(0, 80),
      output_preview: "Retrieved 1 document",
      metadata: buildContextRetrievalMetadata(
        retrieved_docs,
        retrieval_scores,
        retrievalEnrichment
      ),
      error_message: null,
    }),
    step(runId, 3, {
      step_name: "AI Draft Generation",
      status: "success",
      duration_ms: d3,
      input_preview: buildAiDraftInputPreview(retrieved_docs, inputPreview),
      output_preview: draft.slice(0, 160),
      metadata: {
        model_info: { model: "demo-engine-v1", provider: "deterministic" },
        token_estimate: { input: 388, output: 142 },
        ...buildGenerationAttempts([{ attempt: 1, outcome: "success" }]),
      },
      error_message: null,
    }),
    step(runId, 4, {
      step_name: "Response Validation",
      status: "failed",
      duration_ms: d4,
      input_preview: draft.slice(0, 100),
      output_preview: null,
      metadata: buildResponseValidationMetadata(true),
      error_message:
        "Draft missing required policy citation for billing disputes.",
    }),
  ];
}

async function buildSeedRuns(
  sql: NeonQueryFunction<false, false>
): Promise<SeedRun[]> {
  const now = Date.now();

  return Promise.all(
    SEED_RUN_DEFS.map(async (def) => {
      const created_at = seedCreatedAt(now, def.daysAgo, def.hoursAgo ?? 0);
      const retrieval = await retrievePolicyDocuments(sql, def.input);
      const retrievalEnrichment = pickRetrievalEnrichment(
        retrieval,
        def.retrieved_docs
      );

      const steps =
        def.status === "success"
          ? buildSuccessSteps(
              def.run_id,
              def.input,
              def.retrieved_docs,
              def.retrieval_scores,
              def.durations as SuccessDurations,
              retrievalEnrichment
            )
          : buildFailedSteps(
              def.run_id,
              def.input,
              def.retrieved_docs,
              def.retrieval_scores,
              def.durations as FailedDurations,
              retrievalEnrichment
            );

      return {
        run_id: def.run_id,
        status: def.status,
        created_at,
        steps,
      };
    })
  );
}

export async function seedDatabase(sql: NeonQueryFunction<false, false>) {
  await clearSeedData(sql);

  for (const doc of SEED_DOC_DEFS) {
    const content = readPolicyDoc(doc.filename);
    await sql`
      INSERT INTO policy_documents (doc_id, filename, content, tags)
      VALUES (${doc.doc_id}, ${doc.filename}, ${content}, ${doc.tags})
      ON CONFLICT (doc_id) DO UPDATE SET
        filename = EXCLUDED.filename,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags
    `;
  }

  const runs = await buildSeedRuns(sql);

  for (const run of runs) {
    const total_duration_ms = run.steps.reduce((sum, s) => sum + s.duration_ms, 0);

    await sql`
      INSERT INTO workflow_runs (
        run_id,
        workflow_type,
        status,
        total_duration_ms,
        step_count,
        created_at,
        mode,
        client_ip
      )
      VALUES (
        ${run.run_id},
        ${"support_reply"},
        ${run.status},
        ${total_duration_ms},
        ${run.steps.length},
        ${run.created_at.toISOString()},
        ${"demo"},
        ${null}
      )
    `;

    for (const s of run.steps) {
      await sql`
        INSERT INTO workflow_steps (
          step_id,
          run_id,
          step_name,
          status,
          duration_ms,
          input_preview,
          output_preview,
          metadata,
          error_message,
          step_order
        )
        VALUES (
          ${s.step_id},
          ${run.run_id},
          ${s.step_name},
          ${s.status},
          ${s.duration_ms},
          ${s.input_preview},
          ${s.output_preview},
          ${JSON.stringify(s.metadata)},
          ${s.error_message},
          ${s.step_order}
        )
      `;
    }
  }

  return {
    policy_documents: SEED_DOC_DEFS.length,
    workflow_runs: runs.length,
    workflow_steps: runs.reduce((n, r) => n + r.steps.length, 0),
  };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { RunStatus, StepMetadata } from "./types";

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
  | "Policy Retrieval"
  | "AI Draft Generation"
  | "Response Validation"
  | "Finalize Response";

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

function readPolicyDoc(filename: string): string {
  return readFileSync(join(process.cwd(), "seed_docs", filename), "utf8");
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

function buildSuccessSteps(
  runId: string,
  inputPreview: string,
  retrieved_docs: string[],
  retrieval_scores: Record<string, number>
): SeedStep[] {
  const draft =
    "Thank you for reaching out. Based on our policy documents, we can help with your request. I've outlined the next steps and timeline below.";

  return [
    step(runId, 1, {
      step_name: "Input Validation",
      status: "success",
      duration_ms: 95,
      input_preview: inputPreview.slice(0, 120),
      output_preview: "Input valid — 1 issue category detected",
      metadata: { validation_checks: ["length_ok", "category_detected"] },
      error_message: null,
    }),
    step(runId, 2, {
      step_name: "Policy Retrieval",
      status: "success",
      duration_ms: 185,
      input_preview: inputPreview.slice(0, 80),
      output_preview: `Retrieved ${retrieved_docs.length} documents`,
      metadata: { retrieved_docs, retrieval_scores },
      error_message: null,
    }),
    step(runId, 3, {
      step_name: "AI Draft Generation",
      status: "success",
      duration_ms: 1240,
      input_preview: "Context: policy excerpts + user message",
      output_preview: draft.slice(0, 160),
      metadata: {
        model_info: { model: "demo-engine-v1", provider: "deterministic" },
        token_estimate: { input: 412, output: 186 },
      },
      error_message: null,
    }),
    step(runId, 4, {
      step_name: "Response Validation",
      status: "success",
      duration_ms: 110,
      input_preview: draft.slice(0, 100),
      output_preview: "Draft passed safety and tone checks",
      metadata: {
        validation_checks: ["tone_ok", "policy_cited", "no_pii_leak"],
      },
      error_message: null,
    }),
    step(runId, 5, {
      step_name: "Finalize Response",
      status: "success",
      duration_ms: 75,
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
  retrieval_scores: Record<string, number>
): SeedStep[] {
  const draft =
    "We understand you want a refund. Our team will review your account shortly.";

  return [
    step(runId, 1, {
      step_name: "Input Validation",
      status: "success",
      duration_ms: 92,
      input_preview: inputPreview.slice(0, 120),
      output_preview: "Input valid — refund category detected",
      metadata: { validation_checks: ["length_ok", "category_detected"] },
      error_message: null,
    }),
    step(runId, 2, {
      step_name: "Policy Retrieval",
      status: "success",
      duration_ms: 210,
      input_preview: inputPreview.slice(0, 80),
      output_preview: "Retrieved 1 document",
      metadata: { retrieved_docs, retrieval_scores },
      error_message: null,
    }),
    step(runId, 3, {
      step_name: "AI Draft Generation",
      status: "success",
      duration_ms: 1380,
      input_preview: "Context: policy excerpts + user message",
      output_preview: draft.slice(0, 160),
      metadata: {
        model_info: { model: "demo-engine-v1", provider: "deterministic" },
        token_estimate: { input: 388, output: 142 },
      },
      error_message: null,
    }),
    step(runId, 4, {
      step_name: "Response Validation",
      status: "failed",
      duration_ms: 98,
      input_preview: draft.slice(0, 100),
      output_preview: null,
      metadata: {
        validation_checks: ["tone_ok", "policy_citation_missing"],
      },
      error_message:
        "Draft missing required policy citation for billing disputes.",
    }),
  ];
}

function getSeedRuns(): SeedRun[] {
  const now = Date.now();

  return [
    {
      run_id: "run_seed_refund",
      status: "success",
      created_at: new Date(now - 1000 * 60 * 12),
      steps: buildSuccessSteps(
        "run_seed_refund",
        "I was charged twice for my Pro subscription last month and need a refund. Invoice #INV-20481.",
        ["refund_policy", "billing_faq"],
        { refund_policy: 0.92, billing_faq: 0.71 }
      ),
    },
    {
      run_id: "run_seed_billing",
      status: "success",
      created_at: new Date(now - 1000 * 60 * 45),
      steps: buildSuccessSteps(
        "run_seed_billing",
        "Where can I download my invoice for March? I need it for expense reporting.",
        ["billing_faq"],
        { billing_faq: 0.88 }
      ),
    },
    {
      run_id: "run_seed_login",
      status: "success",
      created_at: new Date(now - 1000 * 60 * 90),
      steps: buildSuccessSteps(
        "run_seed_login",
        "I cannot sign in after enabling 2FA. My backup codes do not work.",
        ["login_help"],
        { login_help: 0.94 }
      ),
    },
    {
      run_id: "run_seed_subscription",
      status: "success",
      created_at: new Date(now - 1000 * 60 * 180),
      steps: buildSuccessSteps(
        "run_seed_subscription",
        "Please cancel my Team plan at the end of the billing cycle. We are downgrading to Pro.",
        ["subscription_terms", "billing_faq"],
        { subscription_terms: 0.9, billing_faq: 0.55 }
      ),
    },
    {
      run_id: "run_seed_failed",
      status: "failed",
      created_at: new Date(now - 1000 * 60 * 240),
      steps: buildFailedSteps(
        "run_seed_failed",
        "Your refund policy is unclear. I want money back today for a charge from six months ago.",
        ["refund_policy"],
        { refund_policy: 0.67 }
      ),
    },
  ];
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

  const runs = getSeedRuns();

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
        mode
      )
      VALUES (
        ${run.run_id},
        ${"support_reply"},
        ${run.status},
        ${total_duration_ms},
        ${run.steps.length},
        ${run.created_at.toISOString()},
        ${"demo"}
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

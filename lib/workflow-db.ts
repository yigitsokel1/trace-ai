import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { RunMode, RunStatus, StepMetadata, StepName } from "./types";

type Sql = NeonQueryFunction<false, false>;

export async function insertRunRunning(
  sql: Sql,
  runId: string,
  mode: RunMode = "demo"
) {
  await sql`
    INSERT INTO workflow_runs (
      run_id,
      workflow_type,
      status,
      total_duration_ms,
      step_count,
      mode
    )
    VALUES (
      ${runId},
      ${"support_reply"},
      ${"running"},
      ${0},
      ${0},
      ${mode}
    )
  `;
}

export async function updateRunFinal(
  sql: Sql,
  runId: string,
  status: Exclude<RunStatus, "running">,
  totalDurationMs: number,
  stepCount: number
) {
  await sql`
    UPDATE workflow_runs
    SET
      status = ${status},
      total_duration_ms = ${totalDurationMs},
      step_count = ${stepCount}
    WHERE run_id = ${runId}
  `;
}

export async function insertStepRunning(
  sql: Sql,
  runId: string,
  stepOrder: number,
  stepName: StepName
) {
  const stepId = `step_${runId}_${stepOrder}`;
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
      ${stepId},
      ${runId},
      ${stepName},
      ${"running"},
      ${0},
      ${null},
      ${null},
      ${JSON.stringify({})},
      ${null},
      ${stepOrder}
    )
  `;
  return stepId;
}

export type StepFinalUpdate = {
  stepId: string;
  status: Exclude<RunStatus, "running">;
  durationMs: number;
  inputPreview: string | null;
  outputPreview: string | null;
  metadata: StepMetadata;
  errorMessage: string | null;
};

export async function updateStepFinal(sql: Sql, update: StepFinalUpdate) {
  await sql`
    UPDATE workflow_steps
    SET
      status = ${update.status},
      duration_ms = ${update.durationMs},
      input_preview = ${update.inputPreview},
      output_preview = ${update.outputPreview},
      metadata = ${JSON.stringify(update.metadata)},
      error_message = ${update.errorMessage}
    WHERE step_id = ${update.stepId}
  `;
}

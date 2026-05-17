import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  DashboardData,
  DashboardStats,
  RunDetail,
  RunMode,
  RunStatus,
  StepMetadata,
  WorkflowRun,
  WorkflowStep,
} from "./types";

type Sql = NeonQueryFunction<false, false>;

type RunRow = {
  run_id: string;
  workflow_type: string;
  status: RunStatus;
  total_duration_ms: number;
  step_count: number;
  created_at: string | Date;
  mode: RunMode;
};

type StatsRow = {
  total_runs: number;
  success_rate: number;
  avg_latency_ms: number;
};

export function mapRunRow(row: RunRow): WorkflowRun {
  return {
    run_id: row.run_id,
    workflow_type: row.workflow_type,
    status: row.status,
    total_duration_ms: row.total_duration_ms,
    step_count: row.step_count,
    created_at: new Date(row.created_at),
    mode: row.mode,
  };
}

export async function getDashboardStats(sql: Sql): Promise<DashboardStats> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total_runs,
      COALESCE(
        COUNT(*) FILTER (WHERE status = 'success')::float / NULLIF(COUNT(*), 0),
        0
      ) AS success_rate,
      COALESCE(AVG(total_duration_ms)::int, 0) AS avg_latency_ms
    FROM workflow_runs
  `;
  const row = rows[0] as StatsRow;
  return {
    total_runs: row.total_runs,
    success_rate: Number(row.success_rate),
    avg_latency_ms: row.avg_latency_ms,
  };
}

export async function listWorkflowRuns(
  sql: Sql,
  limit = 50
): Promise<WorkflowRun[]> {
  const rows = await sql`
    SELECT
      run_id,
      workflow_type,
      status,
      total_duration_ms,
      step_count,
      created_at,
      mode
    FROM workflow_runs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (rows as RunRow[]).map(mapRunRow);
}

export async function getDashboardData(sql: Sql): Promise<DashboardData> {
  const [stats, runs] = await Promise.all([
    getDashboardStats(sql),
    listWorkflowRuns(sql),
  ]);
  return { stats, runs };
}

type StepRow = {
  step_id: string;
  run_id: string;
  step_name: string;
  status: RunStatus;
  duration_ms: number;
  input_preview: string | null;
  output_preview: string | null;
  metadata: unknown;
  error_message: string | null;
  step_order: number;
};

function parseMetadata(raw: unknown): StepMetadata {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as StepMetadata;
    } catch {
      return {};
    }
  }
  return raw as StepMetadata;
}

export function mapStepRow(row: StepRow): WorkflowStep {
  return {
    step_id: row.step_id,
    run_id: row.run_id,
    step_name: row.step_name,
    status: row.status,
    duration_ms: row.duration_ms,
    input_preview: row.input_preview,
    output_preview: row.output_preview,
    metadata: parseMetadata(row.metadata),
    error_message: row.error_message,
    step_order: row.step_order,
  };
}

export async function getWorkflowRun(
  sql: Sql,
  runId: string
): Promise<WorkflowRun | null> {
  const rows = await sql`
    SELECT
      run_id,
      workflow_type,
      status,
      total_duration_ms,
      step_count,
      created_at,
      mode
    FROM workflow_runs
    WHERE run_id = ${runId}
    LIMIT 1
  `;
  const row = rows[0] as RunRow | undefined;
  return row ? mapRunRow(row) : null;
}

export async function listWorkflowSteps(
  sql: Sql,
  runId: string
): Promise<WorkflowStep[]> {
  const rows = await sql`
    SELECT
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
    FROM workflow_steps
    WHERE run_id = ${runId}
    ORDER BY step_order ASC
  `;
  return (rows as StepRow[]).map(mapStepRow);
}

export async function getRunWithSteps(
  sql: Sql,
  runId: string
): Promise<RunDetail | null> {
  const run = await getWorkflowRun(sql, runId);
  if (!run) return null;
  const steps = await listWorkflowSteps(sql, runId);
  return { run, steps };
}

export function serializeRunForApi(run: WorkflowRun) {
  return {
    ...run,
    created_at: run.created_at.toISOString(),
  };
}

export function serializeStepForApi(step: WorkflowStep) {
  return step;
}

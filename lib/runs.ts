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

type BaseStatsRow = {
  total_runs: number;
  success_rate: number;
  avg_latency_ms: number;
  failed_runs: number;
};

type SlowestStepRow = {
  step_name: string;
  avg_ms: number;
};

type CommonFailureRow = {
  failure_code: string;
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
  const [baseRows, slowestRows, failureRows] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_runs,
        COALESCE(
          COUNT(*) FILTER (WHERE status = 'success')::float / NULLIF(COUNT(*), 0),
          0
        ) AS success_rate,
        COALESCE(AVG(total_duration_ms)::int, 0) AS avg_latency_ms,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_runs
      FROM workflow_runs
    `,
    sql`
      SELECT step_name, AVG(duration_ms)::int AS avg_ms
      FROM workflow_steps
      GROUP BY step_name
      ORDER BY avg_ms DESC
      LIMIT 1
    `,
    sql`
      WITH failed_step_codes AS (
        SELECT
          CASE
            WHEN jsonb_typeof(ws.metadata->'failed_checks') = 'array'
              AND jsonb_array_length(ws.metadata->'failed_checks') > 0
            THEN ws.metadata->'failed_checks'->>0
            WHEN ws.metadata->'validation_checks' @> '["policy_citation_missing"]'::jsonb
            THEN 'policy_citation_missing'
            ELSE NULL
          END AS failure_code
        FROM workflow_steps ws
        INNER JOIN workflow_runs wr ON wr.run_id = ws.run_id
        WHERE ws.status = 'failed' AND wr.status = 'failed'
      )
      SELECT failure_code
      FROM failed_step_codes
      WHERE failure_code IS NOT NULL
      GROUP BY failure_code
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `,
  ]);

  const base = baseRows[0] as BaseStatsRow;
  const slowest = slowestRows[0] as SlowestStepRow | undefined;
  const failure = failureRows[0] as CommonFailureRow | undefined;

  return {
    total_runs: base.total_runs,
    success_rate: Number(base.success_rate),
    avg_latency_ms: base.avg_latency_ms,
    failed_runs: base.failed_runs,
    most_common_failure: failure?.failure_code ?? null,
    slowest_step_name: slowest?.step_name ?? null,
    slowest_step_avg_ms: slowest?.avg_ms ?? 0,
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

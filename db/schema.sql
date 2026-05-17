CREATE TABLE IF NOT EXISTS policy_documents (
  doc_id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  run_id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL DEFAULT 'support_reply',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  total_duration_ms INTEGER NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode TEXT NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo', 'live'))
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  step_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES workflow_runs (run_id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  duration_ms INTEGER NOT NULL,
  input_preview TEXT,
  output_preview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  step_order INTEGER NOT NULL,
  UNIQUE (run_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_id ON workflow_steps (run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs (created_at DESC);

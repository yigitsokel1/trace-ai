import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard-header";
import { RunStatusBadge } from "@/components/run-status-badge";
import { TraceRunView } from "@/components/trace-run-view";
import { Badge } from "@/components/ui/badge";
import { sql } from "@/lib/db";
import { formatLatency, formatRelativeTime, shortRunId } from "@/lib/format";
import { getRunWithSteps } from "@/lib/runs";
import type { RunDetail } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function loadRunDetail(runId: string): Promise<RunDetail | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await getRunWithSteps(sql, runId);
  } catch {
    return null;
  }
}

export default async function RunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadRunDetail(id);

  if (!detail) {
    notFound();
  }

  const { run, steps } = detail;

  return (
    <>
      <div className="flex flex-col gap-4">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Dashboard
        </Link>

        <DashboardHeader
          title={shortRunId(run.run_id)}
          description={`${run.workflow_type} · ${formatRelativeTime(run.created_at)}`}
        />

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <RunStatusBadge status={run.status} />
          <span className="tabular-nums">{formatLatency(run.total_duration_ms)}</span>
          <span className="text-border">·</span>
          <span>{run.step_count} steps</span>
          <Badge variant="outline" className="capitalize">
            {run.mode}
          </Badge>
        </div>
      </div>

      <TraceRunView totalDurationMs={run.total_duration_ms} steps={steps} />
    </>
  );
}

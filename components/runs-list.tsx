import Link from "next/link";

import { RunStatusBadge } from "@/components/run-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency, formatRelativeTime, shortRunId } from "@/lib/format";
import type { WorkflowRun } from "@/lib/types";
import { cn } from "@/lib/utils";

type RunsListProps = {
  runs: WorkflowRun[];
};

export function RunsList({ runs }: RunsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow runs</CardTitle>
        <CardDescription>
          Recent workflow runs — select a run to inspect the trace.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {runs.map((run) => (
            <li key={run.run_id}>
              <Link
                href={`/runs/${run.run_id}`}
                className={cn(
                  "flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/50",
                  "sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <RunStatusBadge status={run.status} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium">
                      {shortRunId(run.run_id)}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="font-mono text-[10px] font-normal">
                        demo: {run.workflow_type}
                      </Badge>
                      <span>{formatRelativeTime(run.created_at)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                  <span className="tabular-nums">{formatLatency(run.total_duration_ms)}</span>
                  <span className="text-border">·</span>
                  <span>{run.step_count} steps</span>
                  <Badge variant="outline" className="ml-1 capitalize">
                    {run.mode}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

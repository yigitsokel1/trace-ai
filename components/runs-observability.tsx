import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

type RunsObservabilityProps = {
  stats: DashboardStats;
};

export function RunsObservability({ stats }: RunsObservabilityProps) {
  const mostCommonFailure = stats.most_common_failure ?? "—";
  const slowestLabel =
    stats.slowest_step_name != null
      ? `${stats.slowest_step_name} · ${formatLatency(stats.slowest_step_avg_ms)}`
      : "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Failure & performance</CardTitle>
        <CardDescription>
          Aggregated signals across workflow runs in this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-muted-foreground">Most common failure</span>
          <span className="font-mono font-medium">{mostCommonFailure}</span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-muted-foreground">Failed runs</span>
          <span className="font-mono tabular-nums font-medium">
            {stats.failed_runs}
          </span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-muted-foreground">Slowest step avg</span>
          <span className="font-medium">{slowestLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

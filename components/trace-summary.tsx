import { RunStatusBadge } from "@/components/run-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency } from "@/lib/format";
import type { TraceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type TraceSummaryPanelProps = {
  summary: TraceSummary;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

const SEVERITY_CLASS: Record<NonNullable<TraceSummary["failureSeverity"]>, string> = {
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  recoverable:
    "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-400",
  critical:
    "border-destructive/40 bg-destructive/10 text-destructive",
};

export function TraceSummaryPanel({ summary }: TraceSummaryPanelProps) {
  const statusLabel =
    summary.status === "success" ? "Success" : "Failed";

  const rows: { label: string; value: string }[] = [
    { label: "Status", value: statusLabel },
    ...(summary.failedStep
      ? [{ label: "Failed step", value: summary.failedStep }]
      : []),
    {
      label: "Total latency",
      value: formatLatency(summary.totalLatencyMs),
    },
    {
      label: "Total tokens",
      value: summary.totalTokens != null ? String(summary.totalTokens) : "—",
    },
    {
      label: "Retrieved docs",
      value: String(summary.retrievedDocCount),
    },
    { label: "Model", value: summary.model ?? "—" },
  ];

  if (summary.failureReason) {
    rows.push({
      label: "Failure reason",
      value: summary.failureReason,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Trace Summary</CardTitle>
          <RunStatusBadge status={summary.status} />
          {summary.failureSeverity ? (
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px] capitalize",
                SEVERITY_CLASS[summary.failureSeverity]
              )}
            >
              {summary.failureSeverity}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Run-level rollup before the timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <SummaryRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

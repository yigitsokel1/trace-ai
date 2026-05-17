import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency, formatSuccessRate } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";
import { cn } from "@/lib/utils";

type RunsStatsProps = {
  stats: DashboardStats;
};

function successRateValueClass(rate: number): string {
  if (rate >= 0.9) {
    return "text-emerald-700 dark:text-emerald-400";
  }
  if (rate >= 0.7) {
    return "text-amber-700 dark:text-amber-400";
  }
  return "text-muted-foreground";
}

export function RunsStats({ stats }: RunsStatsProps) {
  const items = [
    {
      label: "Total runs",
      value: String(stats.total_runs),
      valueClassName: "text-foreground",
    },
    {
      label: "Success rate",
      value: formatSuccessRate(stats.success_rate),
      valueClassName: successRateValueClass(stats.success_rate),
    },
    {
      label: "Avg latency",
      value: formatLatency(stats.avg_latency_ms),
      valueClassName: "text-sky-700 dark:text-sky-400",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl font-semibold tabular-nums",
                item.valueClassName
              )}
            >
              {item.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

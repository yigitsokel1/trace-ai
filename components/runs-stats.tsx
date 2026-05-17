import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency, formatSuccessRate } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

type RunsStatsProps = {
  stats: DashboardStats;
};

export function RunsStats({ stats }: RunsStatsProps) {
  const items = [
    { label: "Total runs", value: String(stats.total_runs) },
    { label: "Success rate", value: formatSuccessRate(stats.success_rate) },
    { label: "Avg latency", value: formatLatency(stats.avg_latency_ms) },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {item.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

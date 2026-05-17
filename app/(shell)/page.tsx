import { DashboardHeader } from "@/components/dashboard-header";
import { RunsList } from "@/components/runs-list";
import { RunsStats } from "@/components/runs-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sql } from "@/lib/db";
import { getDashboardData } from "@/lib/runs";
import type { DashboardData } from "@/lib/types";

type LoadResult =
  | { status: "no_database" }
  | { status: "error" }
  | { status: "ok"; data: DashboardData };

async function loadDashboard(): Promise<LoadResult> {
  if (!process.env.DATABASE_URL) {
    return { status: "no_database" };
  }

  try {
    const data = await getDashboardData(sql);
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

export default async function DashboardPage() {
  const result = await loadDashboard();

  if (result.status === "no_database") {
    return (
      <>
        <DashboardHeader
          title="Dashboard"
          description="Inspect workflow runs, latency, and step-level traces."
        />
        <DatabaseEmptyState />
      </>
    );
  }

  if (result.status === "error") {
    return (
      <>
        <DashboardHeader
          title="Dashboard"
          description="Inspect workflow runs, latency, and step-level traces."
        />
        <ErrorState />
      </>
    );
  }

  const { data } = result;

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Inspect workflow runs, latency, and step-level traces."
      />
      <RunsStats stats={data.stats} />
      {data.runs.length > 0 ? <RunsList runs={data.runs} /> : <NoRunsState />}
    </>
  );
}

function DatabaseEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow runs</CardTitle>
        <CardDescription>Database connection required.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium">Connect your database</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code> in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, then run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:setup</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NoRunsState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow runs</CardTitle>
        <CardDescription>No executions recorded yet.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium">No runs yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Run <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:setup</code> or
            start a workflow from Demo Workflow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow runs</CardTitle>
        <CardDescription>Could not load run history.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-sm font-medium">Failed to load runs</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Check your database connection and try refreshing the page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

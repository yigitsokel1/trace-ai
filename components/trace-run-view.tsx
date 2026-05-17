"use client";

import { useState } from "react";

import { RunStatusIcon } from "@/components/run-status-badge";
import { StepDetailSheet } from "@/components/step-detail-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLatency } from "@/lib/format";
import type { WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type TraceRunViewProps = {
  totalDurationMs: number;
  steps: WorkflowStep[];
};

export function TraceRunView({ totalDurationMs, steps }: TraceRunViewProps) {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const maxDuration = Math.max(totalDurationMs, 1);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trace timeline</CardTitle>
          <CardDescription>
            Click a step to inspect metadata, retrieved documents, and token usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {steps.map((step) => {
              const barWidth = Math.max(
                (step.duration_ms / maxDuration) * 100,
                step.duration_ms > 0 ? 4 : 0
              );
              const isSelected = selectedStep?.step_id === step.step_id;

              return (
                <li key={step.step_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStep(step)}
                    className={cn(
                      "flex w-full flex-col gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/50",
                      "sm:flex-row sm:items-center sm:gap-6",
                      isSelected && "bg-muted/60",
                      step.status === "failed" && "border-l-2 border-l-destructive"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <RunStatusIcon status={step.status} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{step.step_name}</p>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            {formatLatency(step.duration_ms)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              step.status === "failed"
                                ? "bg-destructive/70"
                                : step.status === "running"
                                  ? "bg-muted-foreground/40"
                                  : "bg-primary/80"
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        {step.error_message ? (
                          <p className="line-clamp-2 text-xs text-destructive">
                            {step.error_message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <StepDetailSheet
        step={selectedStep}
        open={selectedStep != null}
        onOpenChange={(open) => {
          if (!open) setSelectedStep(null);
        }}
      />
    </>
  );
}

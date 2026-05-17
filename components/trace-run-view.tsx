"use client";

import { useMemo, useState } from "react";

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
import {
  buildStepTimeline,
  getTimeAxisTicks,
  segmentBarPercents,
} from "@/lib/trace-timeline";
import type { WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type TraceRunViewProps = {
  totalDurationMs: number;
  steps: WorkflowStep[];
};

function tickAlignClass(index: number, count: number): string {
  if (index === 0) return "translate-x-0";
  if (index === count - 1) return "-translate-x-full";
  return "-translate-x-1/2";
}

export function TraceRunView({ totalDurationMs, steps }: TraceRunViewProps) {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  const segments = useMemo(
    () => buildStepTimeline(steps),
    [steps]
  );

  const axisTicks = useMemo(
    () => getTimeAxisTicks(totalDurationMs, 5),
    [totalDurationMs]
  );

  const showTimeline = totalDurationMs > 0;
  const compactAxis = totalDurationMs > 0 && totalDurationMs < 2000;
  const visibleAxisTicks = compactAxis
    ? axisTicks.filter(
        (_, index) => index === 0 || index === axisTicks.length - 1
      )
    : axisTicks;

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
          {showTimeline ? (
            <div className="overflow-hidden border-b border-border px-6 pb-3 pt-1">
              <div className="relative h-8">
                <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
                {visibleAxisTicks.map((tickMs) => {
                  const index = axisTicks.indexOf(tickMs);
                  const pct =
                    totalDurationMs > 0
                      ? (tickMs / totalDurationMs) * 100
                      : 0;
                  const isFirst = index === 0;
                  const isLast = index === axisTicks.length - 1;

                  return (
                    <span
                      key={`${tickMs}-${index}`}
                      className={cn(
                        "absolute bottom-1 min-w-[2.25rem] font-mono text-[10px] tabular-nums text-muted-foreground sm:text-xs",
                        tickAlignClass(index, axisTicks.length),
                        !isFirst && !isLast && "hidden sm:inline"
                      )}
                      style={{ left: `${pct}%` }}
                    >
                      {formatLatency(tickMs)}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          <ul className="divide-y divide-border">
            {segments.map((segment) => {
              const { step, startMs, endMs } = segment;
              const { leftPct, widthPct } = segmentBarPercents(
                segment,
                totalDurationMs
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
                      isSelected && "bg-muted/40 ring-2 ring-inset ring-primary/40",
                      step.status === "failed" &&
                        "border-l-2 border-l-destructive bg-destructive/5"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <span
                        className="flex h-5 w-8 shrink-0 items-center justify-center font-mono text-xs tabular-nums text-muted-foreground"
                        aria-hidden
                      >
                        {step.step_order}
                      </span>
                      <RunStatusIcon status={step.status} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{step.step_name}</p>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            <span className="hidden sm:inline">
                              {formatLatency(startMs)}–{formatLatency(endMs)}
                              {" · "}
                            </span>
                            {formatLatency(step.duration_ms)}
                          </span>
                        </div>
                        {showTimeline ? (
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                            <div
                              className={cn(
                                "absolute top-0 h-full rounded-full transition-all",
                                step.status === "failed"
                                  ? "bg-destructive/70"
                                  : step.status === "running"
                                    ? "bg-muted-foreground/40"
                                    : "bg-primary/80"
                              )}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                            />
                          </div>
                        ) : null}
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

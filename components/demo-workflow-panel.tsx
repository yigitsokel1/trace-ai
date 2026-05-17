"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";

import { RunStatusBadge } from "@/components/run-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_PRESETS, PIPELINE_STEP_NAMES } from "@/lib/demo-presets";
import { formatLatency } from "@/lib/format";
import type {
  WorkflowPreset,
  WorkflowProgressEvent,
  WorkflowRunResponse,
} from "@/lib/types";
import { runWorkflowStream } from "@/lib/workflow-stream";
import { cn } from "@/lib/utils";

const MAX_INPUT_LENGTH = 500;

type UiStatus = "idle" | "running" | "success" | "error";
type StepUiState = "pending" | "active" | "done" | "failed";

type StepProgressMeta = {
  state: StepUiState;
  durationMs: number | null;
};

function initialStepProgress(): StepProgressMeta[] {
  return PIPELINE_STEP_NAMES.map(() => ({
    state: "pending",
    durationMs: null,
  }));
}

function applyProgressEvent(
  prev: StepProgressMeta[],
  event: WorkflowProgressEvent
): StepProgressMeta[] {
  if (event.type === "step_start") {
    const index = event.step_order - 1;
    return prev.map((step, idx) => {
      if (idx < index) {
        return step.state === "pending"
          ? { ...step, state: "done" }
          : step;
      }
      if (idx === index) {
        return { ...step, state: "active" };
      }
      return { ...step, state: "pending", durationMs: null };
    });
  }

  if (event.type === "step_complete") {
    const index = event.step_order - 1;
    return prev.map((step, idx) => {
      if (idx !== index) return step;
      return {
        state: event.status === "failed" ? "failed" : "done",
        durationMs: event.duration_ms,
      };
    });
  }

  return prev;
}

export function DemoWorkflowPanel() {
  const [input, setInput] = useState(DEMO_PRESETS[0]!.input);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(
    "refund"
  );
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [stepProgress, setStepProgress] = useState<StepProgressMeta[]>(
    initialStepProgress
  );
  const [result, setResult] = useState<WorkflowRunResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charCount = input.length;
  const overLimit = charCount > MAX_INPUT_LENGTH;
  const canRun =
    input.trim().length > 0 && !overLimit && uiStatus !== "running";

  const resetSteps = useCallback(() => {
    setStepProgress(initialStepProgress());
  }, []);

  const handlePreset = (preset: (typeof DEMO_PRESETS)[number]) => {
    if (uiStatus === "running") return;
    setSelectedPreset(preset.id);
    setInput(preset.input);
    setUiStatus("idle");
    setResult(null);
    setErrorMessage(null);
    resetSteps();
  };

  const handleRun = async () => {
    if (!canRun) return;

    setUiStatus("running");
    setResult(null);
    setErrorMessage(null);
    resetSteps();

    try {
      const runResult = await runWorkflowStream({
        input: input.trim(),
        preset: selectedPreset ?? undefined,
        onEvent: (event) => {
          setStepProgress((prev) => applyProgressEvent(prev, event));
        },
      });

      setResult(runResult);
      setUiStatus(runResult.status === "failed" ? "error" : "success");
      if (runResult.status === "failed") {
        setErrorMessage("Workflow stopped at a failed step. Open the trace for details.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Workflow run failed";
      setErrorMessage(message);
      setUiStatus("error");
      resetSteps();
    }
  };

  const handleRetry = () => {
    setUiStatus("idle");
    setErrorMessage(null);
    setResult(null);
    resetSteps();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer message</CardTitle>
          <CardDescription>
            Choose a preset or write your own support request (max {MAX_INPUT_LENGTH}{" "}
            characters).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {DEMO_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant={selectedPreset === preset.id ? "default" : "outline"}
                size="sm"
                disabled={uiStatus === "running"}
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedPreset(null);
                if (uiStatus === "success" || uiStatus === "error") {
                  setUiStatus("idle");
                  setResult(null);
                  setErrorMessage(null);
                }
              }}
              disabled={uiStatus === "running"}
              rows={5}
              maxLength={MAX_INPUT_LENGTH}
              className={cn(
                "w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
                overLimit && "border-destructive ring-destructive/20"
              )}
              placeholder="Describe the customer issue..."
            />
            <p
              className={cn(
                "text-right text-xs tabular-nums",
                overLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {charCount}/{MAX_INPUT_LENGTH}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className="w-fit"
          >
            {uiStatus === "running" ? (
              <>
                <Loader2Icon className="animate-spin" />
                Running pipeline…
              </>
            ) : (
              <>
                <PlayIcon />
                Run workflow
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {(uiStatus === "running" ||
        uiStatus === "success" ||
        uiStatus === "error") && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline progress</CardTitle>
            <CardDescription>
              {uiStatus === "running"
                ? "Steps update as the server executes each pipeline stage."
                : uiStatus === "success"
                  ? "Workflow completed."
                  : "Workflow could not complete."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PIPELINE_STEP_NAMES.map((name, index) => {
                const { state, durationMs } = stepProgress[index] ?? {
                  state: "pending",
                  durationMs: null,
                };
                return (
                  <li
                    key={name}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors",
                      state === "active" && "border-border bg-muted/60",
                      state === "done" && "opacity-90",
                      state === "failed" && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : state === "failed" ? (
                      <XCircleIcon className="size-4 shrink-0 text-destructive" />
                    ) : state === "active" ? (
                      <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span
                        className={cn(
                          "text-sm",
                          state === "pending" && "text-muted-foreground"
                        )}
                      >
                        {name}
                      </span>
                      {durationMs != null ? (
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {formatLatency(durationMs)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            {uiStatus === "success" && result ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <RunStatusBadge status={result.status} />
                  <Badge variant="outline" className="capitalize">
                    {result.mode}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatLatency(result.total_duration_ms)} · {result.step_count}{" "}
                    steps
                  </span>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href={`/runs/${result.run_id}`} />}
                >
                  View Trace
                </Button>
              </div>
            ) : null}

            {uiStatus === "error" ? (
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-destructive">
                  {errorMessage ?? "Workflow run failed"}
                </p>
                <div className="flex gap-2">
                  {result ? (
                    <Button
                      nativeButton={false}
                      render={<Link href={`/runs/${result.run_id}`} />}
                      variant="outline"
                      size="sm"
                    >
                      View Trace
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                    <RotateCcwIcon />
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

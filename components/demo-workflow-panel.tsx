"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";

import { RunStatusBadge } from "@/components/run-status-badge";
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
import type { WorkflowPreset, WorkflowRunResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_INPUT_LENGTH = 500;
const STEP_ANIMATION_MS = 350;

type UiStatus = "idle" | "running" | "success" | "error";
type StepUiState = "pending" | "active" | "done";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStepAnimation(
  setStepStates: React.Dispatch<React.SetStateAction<StepUiState[]>>
) {
  for (let i = 0; i < PIPELINE_STEP_NAMES.length; i++) {
    setStepStates((prev) =>
      prev.map((s, idx) => {
        if (idx < i) return "done";
        if (idx === i) return "active";
        return "pending";
      })
    );
    await sleep(STEP_ANIMATION_MS);
    setStepStates((prev) =>
      prev.map((s, idx) => (idx <= i ? "done" : s))
    );
  }
}

export function DemoWorkflowPanel() {
  const [input, setInput] = useState(DEMO_PRESETS[0]!.input);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(
    "refund"
  );
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [stepStates, setStepStates] = useState<StepUiState[]>(
    PIPELINE_STEP_NAMES.map(() => "pending")
  );
  const [result, setResult] = useState<WorkflowRunResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charCount = input.length;
  const overLimit = charCount > MAX_INPUT_LENGTH;
  const canRun =
    input.trim().length > 0 &&
    !overLimit &&
    uiStatus !== "running";

  const resetSteps = useCallback(() => {
    setStepStates(PIPELINE_STEP_NAMES.map(() => "pending"));
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

    const animation = runStepAnimation(setStepStates);

    const fetchRun = fetch("/api/workflows/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: input.trim(),
        preset: selectedPreset ?? undefined,
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Workflow run failed");
      }
      return data as WorkflowRunResponse;
    });

    try {
      const [, runResult] = await Promise.all([animation, fetchRun]);
      setStepStates(PIPELINE_STEP_NAMES.map(() => "done"));
      setResult(runResult);
      setUiStatus("success");
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
                ? "Executing support reply workflow steps…"
                : uiStatus === "success"
                  ? "Workflow completed."
                  : "Workflow could not complete."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PIPELINE_STEP_NAMES.map((name, index) => {
                const state = stepStates[index] ?? "pending";
                return (
                  <li
                    key={name}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors",
                      state === "active" && "border-border bg-muted/60",
                      state === "done" && "opacity-90"
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : state === "active" ? (
                      <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        state === "pending" && "text-muted-foreground"
                      )}
                    >
                      {name}
                    </span>
                  </li>
                );
              })}
            </ul>

            {uiStatus === "success" && result ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <RunStatusBadge status={result.status} />
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

            {uiStatus === "error" && errorMessage ? (
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-destructive">{errorMessage}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcwIcon />
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

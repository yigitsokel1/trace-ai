import type { WorkflowStep } from "@/lib/types";

export type StepTimelineSegment = {
  step: WorkflowStep;
  startMs: number;
  endMs: number;
};

export function buildStepTimeline(steps: WorkflowStep[]): StepTimelineSegment[] {
  let offset = 0;

  return steps.map((step) => {
    const startMs = offset;
    const endMs = startMs + step.duration_ms;
    offset = endMs;
    return { step, startMs, endMs };
  });
}

export function segmentBarPercents(
  segment: StepTimelineSegment,
  totalDurationMs: number
): { leftPct: number; widthPct: number } {
  const total = Math.max(totalDurationMs, 1);
  const leftPct = (segment.startMs / total) * 100;
  let widthPct = (segment.step.duration_ms / total) * 100;

  if (segment.step.duration_ms > 0) {
    widthPct = Math.max(widthPct, 2);
  }

  widthPct = Math.min(widthPct, 100 - leftPct);

  return { leftPct, widthPct };
}

export function getTimeAxisTicks(
  totalDurationMs: number,
  tickCount = 5
): number[] {
  const total = Math.max(totalDurationMs, 0);
  if (total === 0) return [0];

  const count = Math.max(tickCount, 2);
  const ticks: number[] = [];

  for (let i = 0; i < count; i++) {
    const ms = Math.round((total * i) / (count - 1));
    ticks.push(ms);
  }

  return ticks.filter((ms, index) => index === 0 || ms !== ticks[index - 1]);
}

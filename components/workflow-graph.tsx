import {
  LEGACY_CONTEXT_RETRIEVAL_STEP,
  PIPELINE_STEP_NAMES,
} from "@/lib/pipeline-steps";
import type { WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type WorkflowGraphProps = {
  steps: WorkflowStep[];
  className?: string;
};

export function WorkflowGraph({ steps, className }: WorkflowGraphProps) {
  const statusByName = new Map(steps.map((s) => [s.step_name, s.status]));

  function statusForPipelineStep(name: (typeof PIPELINE_STEP_NAMES)[number]) {
    const direct = statusByName.get(name);
    if (direct) return direct;
    if (name === "Context Retrieval") {
      return statusByName.get(LEGACY_CONTEXT_RETRIEVAL_STEP);
    }
    return undefined;
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-md border border-border bg-muted/20 px-4 py-3",
        className
      )}
    >
      <div className="flex min-w-max items-center gap-1.5 text-xs">
        {PIPELINE_STEP_NAMES.map((name, index) => {
          const status = statusForPipelineStep(name);
          const isFailed = status === "failed";
          const isSuccess = status === "success";

          return (
            <div key={name} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  "whitespace-nowrap rounded-md border px-2 py-1 font-medium",
                  isFailed &&
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  isSuccess &&
                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
                  !isFailed &&
                    !isSuccess &&
                    "border-border bg-background text-muted-foreground"
                )}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

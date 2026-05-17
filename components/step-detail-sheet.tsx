"use client";

import { Badge } from "@/components/ui/badge";
import { RunStatusBadge } from "@/components/run-status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatLatency } from "@/lib/format";
import type { WorkflowStep } from "@/lib/types";

type StepDetailSheetProps = {
  step: WorkflowStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <pre className="max-h-32 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}

export function StepDetailSheet({ step, open, onOpenChange }: StepDetailSheetProps) {
  if (!step) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    );
  }

  const meta = step.metadata;
  const retrievedDocs = meta.retrieved_docs ?? [];
  const retrievalScores = meta.retrieval_scores ?? {};
  const hasRetrieval = retrievedDocs.length > 0 || Object.keys(retrievalScores).length > 0;
  const hasModel = meta.model_info != null;
  const hasTokens = meta.token_estimate != null;
  const hasValidation = (meta.validation_checks?.length ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{step.step_name}</SheetTitle>
          <SheetDescription>
            Step {step.step_order} · {formatLatency(step.duration_ms)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          <Section title="Overview">
            <div className="flex flex-wrap items-center gap-2">
              <RunStatusBadge status={step.status} />
              <span className="text-sm text-muted-foreground">
                Order {step.step_order}
              </span>
            </div>
          </Section>

          {step.error_message ? (
            <Section title="Error">
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {step.error_message}
              </p>
            </Section>
          ) : null}

          {step.input_preview ? (
            <PreviewBlock label="Input preview" value={step.input_preview} />
          ) : null}

          {step.output_preview ? (
            <PreviewBlock label="Output preview" value={step.output_preview} />
          ) : null}

          {hasRetrieval ? (
            <Section title="Retrieved documents">
              {retrievedDocs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {retrievedDocs.map((docId) => (
                    <Badge key={docId} variant="secondary" className="font-mono text-xs">
                      {docId}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {Object.keys(retrievalScores).length > 0 ? (
                <ul className="mt-2 space-y-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  {Object.entries(retrievalScores).map(([docId, score]) => (
                    <li
                      key={docId}
                      className="flex justify-between gap-4 font-mono text-xs"
                    >
                      <span>{docId}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          {hasModel || hasTokens ? (
            <Section title="Model">
              {hasModel ? (
                <p className="text-sm">
                  {meta.model_info!.model}
                  <span className="text-muted-foreground">
                    {" "}
                    · {meta.model_info!.provider}
                  </span>
                </p>
              ) : null}
              {hasTokens ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tokens — in: {meta.token_estimate!.input}, out:{" "}
                  {meta.token_estimate!.output}
                </p>
              ) : null}
            </Section>
          ) : null}

          {hasValidation ? (
            <Section title="Validation checks">
              <ul className="list-inside list-disc space-y-1 text-sm">
                {meta.validation_checks!.map((check) => (
                  <li key={check} className="font-mono text-xs">
                    {check}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
import type { StepMetadata, WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type AiGenerationMode = "live" | "demo" | "quota_fallback";

function resolveAiGenerationMode(meta: StepMetadata): AiGenerationMode | null {
  if (meta.validation_checks?.includes("gemini_quota_fallback")) {
    return "quota_fallback";
  }
  if (meta.model_info?.provider === "google") {
    return "live";
  }
  if (
    meta.model_info?.model === "demo-engine-v1" ||
    meta.model_info?.provider === "deterministic"
  ) {
    return "demo";
  }
  return null;
}

const AI_GENERATION_MODE_LABEL: Record<AiGenerationMode, string> = {
  live: "Live AI",
  demo: "Demo engine",
  quota_fallback: "Quota fallback",
};

function AiGenerationModeBadge({ mode }: { mode: AiGenerationMode }) {
  return (
    <Badge
      variant={mode === "demo" ? "secondary" : "outline"}
      className={cn(
        "w-fit",
        mode === "quota_fallback" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400"
      )}
    >
      {AI_GENERATION_MODE_LABEL[mode]}
    </Badge>
  );
}

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
    <section className="space-y-2.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

type RetrievalScoreTone = "high" | "medium" | "low";

function getRetrievalScoreTone(
  score: number | undefined
): RetrievalScoreTone {
  if (score == null || score < 0.5) return "low";
  if (score >= 0.75) return "high";
  return "medium";
}

const RETRIEVAL_SCORE_DOT_CLASS: Record<RetrievalScoreTone, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

function RetrievalScoreIndicator({ score }: { score: number | undefined }) {
  const tone = getRetrievalScoreTone(score);
  const label =
    score != null ? `Relevance score ${score.toFixed(2)}` : "No relevance score";

  return (
    <span className="flex shrink-0 items-center gap-1.5" title={label}>
      <span
        className={cn("size-2 rounded-full", RETRIEVAL_SCORE_DOT_CLASS[tone])}
        aria-hidden
      />
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {score != null ? score.toFixed(2) : "—"}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums">{value}</p>
    </div>
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
  const matchedKeywords = meta.matched_keywords ?? {};
  const snippets = meta.snippets ?? {};
  const retrievalDocIds =
    retrievedDocs.length > 0
      ? retrievedDocs
      : Object.keys(retrievalScores);
  const hasRetrieval = retrievalDocIds.length > 0;
  const hasModel = meta.model_info != null;
  const hasTokens = meta.token_estimate != null;
  const isAiDraftStep = step.step_name === "AI Draft Generation";
  const aiGenerationMode = isAiDraftStep ? resolveAiGenerationMode(meta) : null;
  const showAiGeneration =
    isAiDraftStep && (hasModel || hasTokens || aiGenerationMode != null);
  const validationChecks =
    meta.validation_checks?.filter(
      (c) => c !== "gemini_quota_fallback" && c !== "rate_limit_fallback"
    ) ?? [];
  const hasValidation = validationChecks.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{step.step_name}</SheetTitle>
          <SheetDescription>
            Step {step.step_order} · {formatLatency(step.duration_ms)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-6 pb-8 pt-1">
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
              <div className="space-y-3">
                {retrievalDocIds.map((docId) => {
                  const score = retrievalScores[docId];
                  const keywords = matchedKeywords[docId] ?? [];
                  const snippet = snippets[docId];

                  return (
                    <article
                      key={docId}
                      className="space-y-2 rounded-md border border-border bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-xs font-medium">{docId}</span>
                        <RetrievalScoreIndicator score={score} />
                      </div>
                      {keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {keywords.map((keyword) => (
                            <Badge
                              key={`${docId}-${keyword}`}
                              variant="secondary"
                              className="font-mono text-[10px]"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {snippet ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {snippet}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {showAiGeneration ? (
            <Section title="AI Generation">
              {aiGenerationMode ? (
                <AiGenerationModeBadge mode={aiGenerationMode} />
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <StatCell
                  label="Latency"
                  value={formatLatency(step.duration_ms)}
                />
                <StatCell
                  label="Model"
                  value={hasModel ? meta.model_info!.model : "—"}
                />
                <StatCell
                  label="Input tokens"
                  value={
                    hasTokens
                      ? String(meta.token_estimate!.input)
                      : "—"
                  }
                />
                <StatCell
                  label="Output tokens"
                  value={
                    hasTokens
                      ? String(meta.token_estimate!.output)
                      : "—"
                  }
                />
              </div>
            </Section>
          ) : null}

          {hasValidation ? (
            <Section title="Validation checks">
              <ul className="list-inside list-disc space-y-1 text-sm">
                {validationChecks.map((check) => (
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

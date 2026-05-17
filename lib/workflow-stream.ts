import type { WorkflowProgressEvent, WorkflowRunResponse } from "@/lib/types";

export type RunWorkflowStreamParams = {
  input: string;
  preset?: string;
  onEvent: (event: WorkflowProgressEvent) => void;
  signal?: AbortSignal;
};

export async function runWorkflowStream(
  params: RunWorkflowStreamParams
): Promise<WorkflowRunResponse> {
  const res = await fetch("/api/workflows/run?stream=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: params.input,
      preset: params.preset,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Workflow run failed"
    );
  }

  if (!res.body) {
    throw new Error("No response body from workflow stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalRun: WorkflowRunResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const event = JSON.parse(trimmed) as WorkflowProgressEvent;
      params.onEvent(event);

      if (event.type === "run_complete") {
        finalRun = event.run;
      }
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const event = JSON.parse(trailing) as WorkflowProgressEvent;
    params.onEvent(event);
    if (event.type === "run_complete") {
      finalRun = event.run;
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }

  if (!finalRun) {
    throw new Error("Workflow stream ended without run_complete");
  }

  return finalRun;
}

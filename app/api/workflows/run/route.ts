import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { WorkflowPreset, WorkflowRunRequest } from "@/lib/types";
import { getClientIp, isRateLimitExceeded } from "@/lib/rate-limit";
import { runSupportWorkflow } from "@/lib/workflow-engine";

export const maxDuration = 10;

const PRESETS = new Set<WorkflowPreset>([
  "refund",
  "billing",
  "login",
  "subscription",
]);

const MAX_INPUT_LENGTH = 500;

function parseBody(body: unknown): WorkflowRunRequest | null {
  if (!body || typeof body !== "object") return null;
  const { input, preset } = body as Record<string, unknown>;
  if (typeof input !== "string") return null;
  if (preset !== undefined && (typeof preset !== "string" || !PRESETS.has(preset as WorkflowPreset))) {
    return null;
  }
  return { input, preset: preset as WorkflowPreset | undefined };
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid request. Expected { input: string, preset?: refund|billing|login|subscription }" },
      { status: 400 }
    );
  }

  const input = parsed.input.trim();
  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `Input must be at most ${MAX_INPUT_LENGTH} characters` },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const rateLimited = await isRateLimitExceeded(sql, clientIp);
  const runOptions = { clientIp, rateLimited };

  const streamProgress =
    new URL(request.url).searchParams.get("stream") === "1";

  if (streamProgress) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const enqueue = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await runSupportWorkflow(sql, input, parsed.preset, enqueue, runOptions);
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Workflow run failed";
          enqueue({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 201,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  try {
    const result = await runSupportWorkflow(
      sql,
      input,
      parsed.preset,
      undefined,
      runOptions
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Workflow run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

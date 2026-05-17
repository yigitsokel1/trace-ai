import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { WorkflowPreset, WorkflowRunRequest } from "@/lib/types";
import { runSupportWorkflow } from "@/lib/workflow-engine";

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

  try {
    const result = await runSupportWorkflow(sql, input, parsed.preset);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Workflow run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

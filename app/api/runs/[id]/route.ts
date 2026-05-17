import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  getRunWithSteps,
  serializeRunForApi,
  serializeStepForApi,
} from "@/lib/runs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  const { id } = await context.params;

  try {
    const detail = await getRunWithSteps(sql, id);
    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      run: serializeRunForApi(detail.run),
      steps: detail.steps.map(serializeStepForApi),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

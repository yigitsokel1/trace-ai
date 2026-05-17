import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getDashboardData, serializeRunForApi } from "@/lib/runs";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const data = await getDashboardData(sql);
    return NextResponse.json({
      stats: data.stats,
      runs: data.runs.map(serializeRunForApi),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

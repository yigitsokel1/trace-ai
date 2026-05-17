import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

function isSeedAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.SEED_SECRET;
  if (!secret) return false;
  return request.headers.get("x-seed-secret") === secret;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  if (!isSeedAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const counts = await seedDatabase(sql);
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

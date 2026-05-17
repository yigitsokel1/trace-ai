import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

const DEFAULT_DAILY_LIMIT = 10;

function getDailyLimit(): number {
  const raw = process.env.RATE_LIMIT_DAILY?.trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

function isRateLimitEnabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase() !== "false";
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

export async function isRateLimitExceeded(
  sql: Sql,
  clientIp: string | null
): Promise<boolean> {
  if (!isRateLimitEnabled() || clientIp == null) {
    return false;
  }

  const limit = getDailyLimit();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM workflow_runs
    WHERE client_ip = ${clientIp}
      AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
  `;

  const count = (rows[0] as { count: number } | undefined)?.count ?? 0;
  return count >= limit;
}

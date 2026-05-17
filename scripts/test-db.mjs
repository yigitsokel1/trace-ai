import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env or .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

try {
  const ping = await sql`SELECT 1 AS ok`;
  console.log("Connection OK:", ping);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(
    "Tables:",
    tables.length ? tables.map((t) => t.table_name).join(", ") : "(none yet)"
  );
} catch (e) {
  console.error("Connection failed:", e.message);
  process.exit(1);
}

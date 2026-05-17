import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFiles(root) {
  const base = root ?? resolve(import.meta.dirname, "..");
  for (const file of [".env.local", ".env"]) {
    const path = resolve(base, file);
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
}

export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env or .env.local");
    process.exit(1);
  }
  return process.env.DATABASE_URL;
}

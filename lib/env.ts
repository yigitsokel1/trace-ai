import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFiles(root = process.cwd()) {
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
}

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL not set in .env or .env.local");
  }
  return url;
}

/** @returns never — exits process when unset (CLI scripts) */
export function requireDatabaseUrlOrExit(): string {
  try {
    return requireDatabaseUrl();
  } catch {
    console.error("DATABASE_URL not set in .env or .env.local");
    process.exit(1);
  }
}

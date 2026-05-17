import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, requireDatabaseUrl } from "./load-env.mjs";

const root = resolve(import.meta.dirname, "..");
loadEnvFiles(root);
requireDatabaseUrl();

const schemaPath = resolve(root, "db", "schema.sql");
const schema = readFileSync(schemaPath, "utf8");

const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const sql = neon(process.env.DATABASE_URL);

try {
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log("Migration OK:", statements.length, "statements applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}

import { neon } from "@neondatabase/serverless";
import { loadEnvFiles, requireDatabaseUrlOrExit } from "../lib/env";
import { seedDatabase } from "../lib/seed";

async function main() {
  loadEnvFiles();
  const url = requireDatabaseUrlOrExit();
  const sql = neon(url);
  const counts = await seedDatabase(sql);
  console.log("Seed OK:", counts);
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Seed failed:", message);
  process.exit(1);
});

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "docs", "assets");
const base = "https://trace-ai.osmanyigitsokel.com";
const runId = "run_seed_refund";

await mkdir(assetsDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(assetsDir, "traceai-dashboard.png"),
  fullPage: false,
});

await page.goto(`${base}/runs/${runId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({
  path: path.join(assetsDir, "traceai-run-detail.png"),
  fullPage: false,
});

await page.locator("li button", { hasText: "Context Retrieval" }).first().click();
await page.waitForSelector("h2", { hasText: "Context Retrieval" });
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(assetsDir, "traceai-step-drawer.png"),
  fullPage: false,
});

await browser.close();
console.log("Screenshots saved to docs/assets/");

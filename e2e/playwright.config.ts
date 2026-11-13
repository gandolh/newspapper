import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

/**
 * The browser specs: the redesign's focus, reduced-motion, phone-overflow and theme checks, and the screenshot run.
 *
 * They need no API and no account: `fixtures.ts` answers every `/api/*` request the app makes, and aborts the ones
 * that would reach the outside (the Reader's refresh, a live search). The UI is the Vite dev server, started here
 * on `E2E_PORT` (4781 by default) with the Playwright browser from the local cache (`E2E_CHROMIUM` names another).
 * Headless Chromium only, and at most two workers: other work shares the machine.
 */
const port = Number(process.env["E2E_PORT"] ?? 4781);
const executablePath = process.env["E2E_CHROMIUM"] || undefined;

export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "**/*.spec.ts",
  workers: 2,
  fullyParallel: false,
  reporter: "list",
  timeout: 60_000,
  // Traces and failure shots stay out of the tree.
  outputDir: fileURLToPath(new URL("../node_modules/.tmp/e2e-results", import.meta.url)),
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    launchOptions: { executablePath },
  },
  webServer: {
    command: `node ../node_modules/vite/bin/vite.js --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("../ui", import.meta.url)),
    port,
    reuseExistingServer: true,
    timeout: 90_000,
  },
});

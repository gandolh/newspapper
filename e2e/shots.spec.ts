/**
 * Screenshots of every screen, for comparing the build with the board's comps. Skipped unless `SHOTS_DIR` is set:
 *
 *   SHOTS_DIR=/some/folder npx playwright test -c e2e/playwright.config.ts shots
 *
 * One PNG per screen, theme and width, named `<screen>-<theme>-<width>.png`: the viewport at 1280 x 800 and
 * 390 x 844, plus the whole page where it scrolls. Nothing is written into the repo.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { settle, stubApi } from "./fixtures";

const DIR = process.env["SHOTS_DIR"];
const SIZES = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;

interface Screen {
  name: string;
  path: string;
  /** Runs after the page has settled, to open a dialog or pick a pane. */
  prepare?: (page: Page) => Promise<void>;
  /** Only at these widths. */
  widths?: readonly number[];
  options?: Parameters<typeof stubApi>[1];
}

export const SCREENS: Screen[] = [
  { name: "editor", path: "/?post=1" },
  {
    name: "editor-inspector",
    path: "/?post=1",
    widths: [390],
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Inspector" }).click();
    },
  },
  {
    name: "editor-source",
    path: "/?post=1",
    widths: [390],
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Source" }).click();
    },
  },
  { name: "posts", path: "/posts" },
  { name: "posts-empty", path: "/posts", options: { posts: [] } },
  { name: "reader", path: "/reader" },
  { name: "settings", path: "/settings" },
  { name: "login", path: "/login", options: { signedOut: true } },
];

test.describe("shots", () => {
  test.skip(!DIR, "set SHOTS_DIR to take the screenshots");

  for (const screen of SCREENS) {
    for (const theme of ["light", "dark"] as const) {
      for (const size of SIZES) {
        if (screen.widths && !screen.widths.includes(size.width)) continue;
        test(`${screen.name} ${theme} ${size.width}`, async ({ page }) => {
          mkdirSync(DIR!, { recursive: true });
          await page.addInitScript((choice) => localStorage.setItem("newspapper-appearance", choice), theme);
          await page.setViewportSize(size);
          const stub = await stubApi(page, screen.options);
          await page.goto(screen.path);
          await settle(page);
          await screen.prepare?.(page);
          await settle(page);
          await page.screenshot({ path: join(DIR!, `${screen.name}-${theme}-${size.width}.png`) });
          await page.screenshot({ path: join(DIR!, `${screen.name}-${theme}-${size.width}-full.png`), fullPage: true });
          expect(stub.blocked).toEqual([]);
          expect(stub.unhandled).toEqual([]);
        });
      }
    }
  }
});

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

/** Below 1100px the Reader opens on the items; the rail is one tap back. */
async function openRail(page: Page): Promise<void> {
  const back = page.getByRole("button", { name: "Feeds", exact: true });
  if (await back.isVisible()) await back.click();
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
  {
    name: "editor-slide-selected",
    path: "/?post=1",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Slide 2", exact: true }).click();
    },
  },
  {
    name: "editor-toast",
    path: "/?post=1",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Render", exact: true }).click();
      await page.getByText("Rendered.").waitFor();
    },
  },
  {
    name: "editor-image-picker",
    path: "/?post=1",
    widths: [1280],
    prepare: async (page) => {
      await page.getByRole("button", { name: "Image", exact: true }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { name: "posts", path: "/posts" },
  { name: "posts-empty", path: "/posts", options: { posts: [] } },
  {
    name: "posts-delete-confirm",
    path: "/posts",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Delete" }).first().click();
      await page.getByRole("alertdialog").waitFor();
    },
  },
  { name: "reader", path: "/reader" },
  {
    name: "reader-item",
    path: "/reader",
    prepare: async (page) => {
      await page.getByRole("button", { name: /Item 2:/ }).click();
      await page.getByRole("heading", { name: /Item 2:/ }).waitFor();
    },
  },
  {
    name: "reader-all",
    path: "/reader",
    prepare: async (page) => {
      await page.getByRole("radio", { name: "All", exact: true }).first().click();
      await page.getByRole("button", { name: /Item 1:/ }).waitFor();
    },
  },
  {
    name: "reader-sources",
    path: "/reader",
    prepare: async (page) => {
      await openRail(page);
      await page.getByRole("button", { name: /^Sources/ }).click();
      await page.getByRole("heading", { name: "Sources" }).waitFor();
    },
  },
  {
    name: "reader-add-source",
    path: "/reader",
    prepare: async (page) => {
      await openRail(page);
      await page.getByRole("button", { name: /^Sources/ }).click();
      await page.getByRole("button", { name: /Add source/ }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "reader-library",
    path: "/reader",
    prepare: async (page) => {
      await openRail(page);
      await page.getByRole("button", { name: /^Library/ }).click();
      await page.getByRole("heading", { name: "Library" }).waitFor();
    },
  },
  {
    name: "reader-search",
    path: "/reader",
    prepare: async (page) => {
      await openRail(page);
      await page.getByRole("button", { name: /^Search/ }).click();
      await page.getByRole("heading", { name: "Search" }).waitFor();
    },
  },
  {
    name: "reader-legend",
    path: "/reader",
    prepare: async (page) => {
      await openRail(page);
      await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { name: "settings", path: "/settings" },
  { name: "login", path: "/login", options: { signedOut: true } },
  { name: "kitchen-sink", path: "/kitchen-sink" },
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

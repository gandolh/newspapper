/**
 * Two things a jsdom test cannot see, in real Chromium (the base-ui skill's rule
 * 17; behind the same guard as `SourcePane.wax.test.ts`):
 *
 * - the toast viewport is in a portal, outside the app root, and is in a live
 *   region the screen reader announces from, and an error toast stays until it
 *   is dismissed;
 * - the editor's pane switcher (`Tabs`): arrow keys move the selected tab, and
 *   one pane is on screen at a time.
 *
 * The real `ToastProvider` and `Tabs` are bundled by Vite and mounted in a
 * Chromium page. Skipped with a banner locally if Chromium is missing, a failure
 * under `CI`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build, type Plugin, type Rollup } from "vite";
import { getBrowser } from "../../../../core/src/render/browser.js";
import { probeChromium, type ChromiumGuard } from "../../../../core/src/render/test-support/chromium.js";

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>;

const ORIGIN = "http://toast.test";
let chromium: ChromiumGuard;
let page: Page | null = null;
const pageErrors: string[] = [];

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

function entry(): Plugin {
  const id = "virtual:toast-tabs-entry";
  return {
    name: "toast-tabs-entry",
    resolveId: (source) => (source.endsWith(id) ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id
        ? `
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ${JSON.stringify(here("../../styles/index.css"))};
import ${JSON.stringify(here("../../styles/global.css"))};
import { ToastProvider, useToast, Tabs } from ${JSON.stringify(here("./index.ts"))};
const TABS = [
  { value: 'source', label: 'Source' },
  { value: 'preview', label: 'Preview' },
  { value: 'inspector', label: 'Inspector' },
];
function Harness() {
  const { addToast } = useToast();
  const [pane, setPane] = useState('preview');
  return h('div', { id: 'app' },
    h('button', { type: 'button', onClick: () => addToast('Saved', 'success', 60000) }, 'Raise note'),
    h('button', { type: 'button', onClick: () => addToast('It broke', 'error', 50) }, 'Raise error'),
    h(Tabs, { label: 'Editor pane', tabs: TABS, value: pane, onValueChange: setPane },
      (value) => h('p', { 'data-pane': value }, value)),
  );
}
export function mount() {
  const root = createRoot(document.getElementById('host'));
  flushSync(() => root.render(h(ToastProvider, null, h(Harness))));
}
`
        : null,
  };
}

async function bundle(): Promise<{ js: string; css: string }> {
  const result = (await build({
    configFile: false,
    logLevel: "silent",
    root: here("../../.."),
    plugins: [tailwindcss(), entry()],
    esbuild: { jsx: "automatic", jsxDev: false },
    resolve: { alias: { "@": here("../..") } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: "virtual:toast-tabs-entry", formats: ["iife"], name: "Harness", fileName: "harness" },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0].output;
  const js = output.find((o): o is Rollup.OutputChunk => o.type === "chunk");
  const css = output
    .filter((o): o is Rollup.OutputAsset => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  if (!js) throw new Error("vite produced no chunk for the harness");
  return { js: js.code, css };
}

beforeAll(async () => {
  chromium = await probeChromium("ToastAndTabs.chromium.test", "the toast portal and the pane tabs' arrow keys");
  if (!chromium.available) return;
  const { js, css } = await bundle();
  page = await (await getBrowser()).newPage({ viewport: { width: 800, height: 600 } });
  await page.route(`${ORIGIN}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><style>html,body{margin:0}</style></head><body><div id="host"></div></body></html>',
    }),
  );
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
  await page.evaluate(() => (globalThis as unknown as { Harness: { mount(): void } }).Harness.mount());
}, 120_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

describe("the toast portal", () => {
  it("renders the viewport outside the app root, in a live region", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    await page!.getByRole("button", { name: "Raise note" }).click();
    await page!.getByText("Saved").waitFor();
    const where = await page!.evaluate(() => {
      const title = [...document.querySelectorAll("*")].find(
        (el) => el.children.length === 0 && el.textContent === "Saved",
      );
      const host = document.getElementById("host")!;
      return {
        outsideRoot: !!title && !host.contains(title),
        // A live region above the title: the viewport or the toast's own.
        live: !!title?.closest("[aria-live]"),
        parentOfViewport: title?.closest("[aria-live]")?.parentElement?.tagName ?? null,
      };
    });
    expect(where.outsideRoot).toBe(true);
    expect(where.live).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  it("keeps an error toast until it is dismissed", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    await page!.getByRole("button", { name: "Raise error" }).click();
    const error = page!.locator('[role="alertdialog"][data-type="error"]');
    await error.waitFor();
    // The caller asked for 50 ms; an error ignores it.
    await page!.waitForTimeout(600);
    expect(await error.count()).toBe(1);
    // Base UI keeps the close button out of the accessibility tree until F6 puts focus in the region.
    await page!.keyboard.press("F6");
    await error.getByRole("button", { name: "Dismiss" }).click();
    await page!.waitForFunction(() => !document.body.textContent?.includes("It broke"));
  });
});

describe("the pane tabs", () => {
  it("is a tablist, and one pane is on screen", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    expect(await page!.getByRole("tablist", { name: "Editor pane" }).count()).toBe(1);
    expect(await page!.getByRole("tab").count()).toBe(3);
    await expect.poll(() => page!.locator("[data-pane]").allTextContents()).toEqual(["preview"]);
    expect(await page!.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected")).toBe("true");
  });

  it("moves the selected tab, and the pane with it, on the arrow keys", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    await page!.getByRole("tab", { name: "Preview" }).focus();
    await page!.keyboard.press("ArrowRight");
    expect(await page!.getByRole("tab", { name: "Inspector" }).getAttribute("aria-selected")).toBe("true");
    await expect.poll(() => page!.locator("[data-pane]").allTextContents()).toEqual(["inspector"]);
    await page!.keyboard.press("ArrowLeft");
    await page!.keyboard.press("ArrowLeft");
    expect(await page!.getByRole("tab", { name: "Source" }).getAttribute("aria-selected")).toBe("true");
    await expect.poll(() => page!.locator("[data-pane]").allTextContents()).toEqual(["source"]);
  });
});

/**
 * The tray and the bottom bar swap at 860px: below it (`phone:`, a `max-width: 859px` query) the tray thins to a
 * 48px bar with no places and the 64px bottom bar shows the four places, each with its label; from 860 up the tray
 * is 56px with the places and the bottom bar is gone. The test pins both sides of the edge in real Chromium, on the
 * shipped Sidebar and BottomBar.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build, type Plugin, type Rollup } from "vite";
import { getBrowser } from "../../../core/src/render/browser.js";
import { probeChromium, type ChromiumGuard } from "../../../core/src/render/test-support/chromium.js";

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>;

const ORIGIN = "http://tray.test";
const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

let chromium: ChromiumGuard;
let page: Page | null = null;

function entry(): Plugin {
  const id = "virtual:tray-entry";
  return {
    name: "tray-entry",
    resolveId: (source) => (source.endsWith(id) ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id
        ? `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import ${JSON.stringify(here("../styles/index.css"))};
import { BottomBar, Sidebar } from ${JSON.stringify(here("./Sidebar.tsx"))};
createRoot(document.getElementById('host')).render(createElement('div', null, createElement(Sidebar), createElement(BottomBar)));`
        : null,
  };
}

beforeAll(async () => {
  chromium = await probeChromium("Sidebar.chromium.test", "that the tray folds at the breakpoints");
  if (!chromium.available) return;
  const result = (await build({
    configFile: false,
    logLevel: "silent",
    root: here("../.."),
    plugins: [tailwindcss(), entry()],
    esbuild: { jsx: "automatic", jsxDev: false },
    resolve: { alias: { "@": here("..") } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: "virtual:tray-entry", formats: ["iife"], name: "Tray", fileName: "t" },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0].output;
  const js = output.find((o): o is Rollup.OutputChunk => o.type === "chunk")?.code ?? "";
  const css = output
    .filter((o): o is Rollup.OutputAsset => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  page = await (await getBrowser()).newPage({ viewport: { width: 1000, height: 600 } });
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/" || path === "/posts") {
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><style>${css}</style></head><body><div id="host"></div><script>${js}</script></body></html>`,
      });
    }
    return route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"no session"}' });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("nav[aria-label='Main navigation']");
}, 120_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

async function tray(width: number) {
  await page!.setViewportSize({ width, height: 600 });
  return page!.evaluate(() => {
    const visible = (el: Element): boolean => getComputedStyle(el).display !== "none";
    const places = document.querySelector("nav[aria-label='Main navigation']")!;
    const bottom = document.querySelector("nav[aria-label='Places']")!;
    const bar = places.parentElement!;
    return {
      places: visible(places),
      bottom: visible(bottom),
      bottomHeight: Math.round(bottom.getBoundingClientRect().height),
      trayHeight: Math.round(bar.getBoundingClientRect().height),
      labels: Array.from(bottom.querySelectorAll("a")).map((a) => a.textContent?.trim()),
    };
  });
}

describe("the tray and the bottom bar swap at 860px (Chromium)", () => {
  it("is a 48px bar with a 64px bottom bar below 860px, and a 56px tray from 860px", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const phone = await tray(859);
    expect(phone).toMatchObject({ places: false, bottom: true, trayHeight: 48, bottomHeight: 64 });
    const desktop = await tray(860);
    expect(desktop).toMatchObject({ places: true, bottom: false, trayHeight: 56 });
    expect((await tray(1280)).places).toBe(true);
  });

  it("names the four places on the bottom bar", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    expect((await tray(390)).labels).toEqual(["Editor", "Posts", "Reader", "Settings"]);
  });
});

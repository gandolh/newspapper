/**
 * The tray folds with Tailwind's own breakpoints: `max-sm:` (below 640px) into two courses, `max-md:` (below
 * 768px) into narrower compartments. Tailwind compiles them to `width < 40rem` and `width < 48rem`, so the exact
 * boundary pixel (640 and 768) shows the wide layout: a one-pixel edge the owner accepts (the old CSS folded at
 * `max-width: 640px`, inclusive). The test pins both sides of each edge in real Chromium, on the shipped Sidebar.
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
import { Sidebar } from ${JSON.stringify(here("./Sidebar.tsx"))};
createRoot(document.getElementById('host')).render(createElement(Sidebar));`
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
    const nav = document.querySelector("nav[aria-label='Main navigation']")!;
    const link = nav.querySelector("ul a") as HTMLElement;
    return { display: getComputedStyle(nav).display, navWidth: Math.round(link.getBoundingClientRect().width) };
  });
}

describe("the tray folds at Tailwind's breakpoints (Chromium)", () => {
  it("is two courses below 640px, and one strip from 640px (the accepted one-pixel edge)", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    expect((await tray(639)).display).toBe("grid");
    expect((await tray(640)).display).toBe("flex");
    expect((await tray(1000)).display).toBe("flex");
  });

  it("narrows its compartments from 104px to 78px below 768px (the same edge at 768)", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    expect((await tray(769)).navWidth).toBe(104);
    expect((await tray(768)).navWidth).toBe(104);
    expect((await tray(767)).navWidth).toBe(78);
  });
});

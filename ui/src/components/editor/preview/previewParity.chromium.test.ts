/**
 * The preview shares no CSS with the render, and must not drift from it.
 *
 * `TNodeView` paints each node with core's `resolveStyle` as an inline style,
 * the same function the Chromium render runs, and the render's whole
 * stylesheet is a reset (`*{margin:0;padding:0;box-sizing:border-box}`) plus
 * the body font. So the risk is one-way: **a global rule in the app's
 * stylesheet that reaches inside the 1080² canvas changes the preview and not
 * the render.** Nothing else would notice.
 *
 * In real Chromium, one slide is shown twice on one page: the interpreter's
 * own HTML (`renderTemplate`, in an iframe, as the render builds it) and the
 * app's `SlideCanvas` at scale 1 (the shipped component with the app's
 * stylesheet). Node for node, in DOM order, the box and the text properties
 * that decide a slide's look must be equal. The control injects a global
 * `div { padding-top: 2px }` and the comparison must then fail: a parity test
 * that has never failed has not been shown to reach anything.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build, type Plugin, type Rollup } from "vite";
import { compile, parse, WZD_SAMPLES } from "@newspapper/core/wizard";
import { renderTemplate, type Theme } from "@newspapper/core/templates";
import { getBrowser } from "../../../../../core/src/render/browser.js";
import { probeChromium, type ChromiumGuard } from "../../../../../core/src/render/test-support/chromium.js";

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>;

const ORIGIN = "http://parity.test";
const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

const theme = JSON.parse(
  readFileSync(here("../../../../../assets/design-systems/warm-industrial-1.json"), "utf8"),
) as Theme;

let chromium: ChromiumGuard;
let page: Page | null = null;
const pageErrors: string[] = [];

/** A virtual entry that mounts the real SlideCanvas and exposes `mount()`. */
function entry(): Plugin {
  const id = "virtual:parity-entry";
  return {
    name: "parity-entry",
    resolveId: (source) => (source.endsWith(id) ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id
        ? `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ${JSON.stringify(here("../../../styles/index.css"))};
import ${JSON.stringify(here("../../../styles/global.css"))};
import { SlideCanvas } from ${JSON.stringify(here("./SlideCanvas.tsx"))};
let root = null;
export function mount(slide, theme) {
  const host = document.getElementById('host');
  if (!root) root = createRoot(host);
  const noop = () => {};
  flushSync(() =>
    root.render(
      createElement(SlideCanvas, {
        slideKey: 'parity',
        slide,
        theme,
        scale: 1,
        selectedOffset: null,
        gestures: { onSelect: noop, onDragStart: noop, onDragMove: noop, onDragEnd: noop },
        slots: [],
        dragActive: false,
        activeZoneKey: null,
        onZonesMeasured: noop,
      }),
    ),
  );
}
`
        : null,
  };
}

async function bundle(): Promise<{ js: string; css: string }> {
  const result = (await build({
    configFile: false,
    logLevel: "silent",
    root: here("../../../.."),
    plugins: [tailwindcss(), entry()],
    esbuild: { jsx: "automatic", jsxDev: false },
    resolve: { alias: { "@": here("../../..") } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: "virtual:parity-entry", formats: ["iife"], name: "Parity", fileName: "parity" },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0].output;
  const js = output.find((o): o is Rollup.OutputChunk => o.type === "chunk");
  const css = output
    .filter((o): o is Rollup.OutputAsset => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  if (!js) throw new Error("vite produced no chunk for SlideCanvas");
  if (css.length === 0) throw new Error("the app's stylesheet did not make it into the bundle");
  return { js: js.code, css };
}

beforeAll(async () => {
  chromium = await probeChromium("previewParity.chromium.test", "that the preview canvas matches the render");
  if (!chromium.available) return;
  const { js, css } = await bundle();
  const appFonts = here("../../../../public/fonts/");
  const slideFonts = here("../../../../../assets/fonts/");
  page = await (await getBrowser()).newPage({ viewport: { width: 1200, height: 1200 } });
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    for (const [prefix, dir] of [
      ["/fonts/", appFonts],
      ["/slide-fonts/", slideFonts],
    ] as const) {
      if (path.startsWith(prefix)) {
        const body = await readFileAsync(dir + path.slice(prefix.length)).catch(() => null);
        return body
          ? route.fulfill({ body, contentType: path.endsWith(".ttf") ? "font/ttf" : "font/woff2" })
          : route.fulfill({ status: 404, body: "" });
      }
    }
    return route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head></head><body><div id="host"></div></body></html>',
    });
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
}, 120_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

const PROPS = [
  "fontFamily",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "boxSizing",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const;

interface NodeFacts {
  rect: [number, number, number, number];
  style: Record<string, string>;
}

/** Shows `slide` in both ways and returns node-by-node differences. */
async function differences(slideTree: unknown, referenceHtml: string): Promise<string[]> {
  return page!.evaluate(
    async ({ slide, theme, html, props }) => {
      const w = window as unknown as { Parity: { mount: (s: unknown, t: unknown) => void } };
      w.Parity.mount(slide, theme);
      document.getElementById("ref")?.remove();
      const frame = document.createElement("iframe");
      frame.id = "ref";
      frame.style.cssText = "position:absolute;left:0;top:1100px;width:1080px;height:1080px;border:0";
      document.body.append(frame);
      await new Promise<void>((resolve) => {
        frame.addEventListener("load", () => resolve(), { once: true });
        frame.srcdoc = html;
      });
      const refDoc = frame.contentDocument!;
      await Promise.all([document.fonts.ready, refDoc.fonts.ready]);

      const facts = (root: Element): NodeFacts[] => {
        const base = root.getBoundingClientRect();
        return [root, ...root.querySelectorAll("div")].map((el) => {
          const r = el.getBoundingClientRect();
          const cs = (el.ownerDocument.defaultView as Window).getComputedStyle(el) as unknown as Record<string, string>;
          const style: Record<string, string> = {};
          for (const p of props) {
            const value = cs[p] ?? "";
            // The fallback tail after Inter differs on purpose and shows only when Inter fails to load
            // (the render's is "sans-serif", the app's the system stack), so the first family is compared.
            style[p] = p === "fontFamily" ? (value.split(",")[0] ?? "").trim() : value;
          }
          return { rect: [r.left - base.left, r.top - base.top, r.width, r.height], style };
        });
      };
      const canvas = document.getElementById("host")!.firstElementChild!.firstElementChild!;
      const preview = facts(canvas);
      const render = facts(refDoc.body.firstElementChild!);
      const out: string[] = [];
      if (preview.length !== render.length) out.push(`node count: preview ${preview.length}, render ${render.length}`);
      for (let i = 0; i < Math.min(preview.length, render.length); i++) {
        const a = preview[i]!;
        const b = render[i]!;
        a.rect.forEach((v, k) => {
          if (Math.abs(v - b.rect[k]!) > 0.01) out.push(`node ${i}: rect[${k}] preview ${v}, render ${b.rect[k]}`);
        });
        for (const p of props) {
          if (a.style[p] !== b.style[p]) out.push(`node ${i}: ${p} preview "${a.style[p]}", render "${b.style[p]}"`);
        }
      }
      return out;
    },
    { slide: slideTree, theme, html: referenceHtml, props: [...PROPS] },
  );
}

/** Every clean sample's slides, as the render builds them. */
const cases = WZD_SAMPLES.filter((s) => s.clean).flatMap((sample) => {
  const doc = parse(sample.source).doc;
  const { slides } = compile(doc, theme);
  return slides.map((slide, i) => ({
    name: `${sample.name} / slide ${i + 1}`,
    slide,
    html: renderTemplate(slide, {}, theme, {
      index: i + 1,
      total: slides.length,
      fontBaseUrl: `${ORIGIN}/slide-fonts`,
    }),
  }));
});

describe("the preview canvas matches the render", () => {
  it("has slides to compare", () => {
    expect(cases.length).toBeGreaterThan(5);
  });

  for (const c of cases) {
    it(`${c.name}`, async (ctx) => {
      if (!chromium.orSkip((note) => ctx.skip(note))) return;
      expect(await differences(c.slide, c.html)).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  it("control: a global rule reaching the canvas makes the comparison fail", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const sample = cases.find((c) => c.name.startsWith("list"))!;
    const style = await page!.addStyleTag({ content: "div { padding-top: 2px }" });
    try {
      const found = await differences(sample.slide, sample.html);
      expect(found.length).toBeGreaterThan(0);
      expect(found.some((line) => line.includes("paddingTop"))).toBe(true);
    } finally {
      await style.evaluate((el) => (el as Element).remove());
    }
    expect(await differences(sample.slide, sample.html)).toEqual([]);
  });
});

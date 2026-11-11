/**
 * The wax that marks the selected element in the galley must not
 * cover a single glyph, in the run or beside it.
 *
 * **Paint order is the whole bug, so this runs in real Chromium.** happy-dom
 * lays nothing out and paints nothing; a test there would pass on any CSS. The
 * shipped `SourcePane`, its CSS modules and `global.css` are bundled by Vite
 * and mounted in a Chromium page at a device scale of 3 (the 300%
 * zoom it was reported at), with the galley's own Spline Sans Mono served from `ui/public/fonts/`.
 * It goes through the same Chromium guard as the render tests: skipped with a
 * banner locally if Chromium is missing, a failure under `CI`.
 *
 * The check, per glyph: count its ink pixels with the wax painted, then again
 * with every background and shadow in the galley switched off (the control).
 * Wax under a glyph changes almost nothing about its ink; wax *over* a glyph
 * removes it. Under the old paint order, where every token carried its own
 * 0.35em `box-shadow` bleed, the next token's bleed covered about half of the
 * previous token's last glyph, so those glyphs kept well under half their ink.
 * That failure was watched before the fix went in.
 *
 * A text selection gets the same check. The textarea used to paint it, above
 * the galley, as an opaque wax ground under transparent ink, so every
 * selected glyph lost all of its ink; that failure was watched too
 * (2026-11-05). The control switches off the textarea's `::selection` ground
 * as well as the galley's, or it would hide the glyphs it is the control for.
 * Since 2026-11-06 a selection is non-photo blue, painted above the element's
 * wax run, so a selection inside the run shows where it starts and ends.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, type Plugin, type Rollup } from "vite";
import { getBrowser } from "../../../../core/src/render/browser.js";
import { probeChromium, type ChromiumGuard } from "../../../../core/src/render/test-support/chromium.js";

/** Playwright's `Page`, taken from core's `getBrowser` rather than imported
 * from `playwright`, which `ui/package.json` does not declare. */
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>;

const ORIGIN = "http://galley.test";
const SCALE = 3;

let chromium: ChromiumGuard;
let page: Page | null = null;
const pageErrors: string[] = [];

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

/** A virtual entry that mounts the real SourcePane and exposes `mount()`. */
function entry(): Plugin {
  const id = "virtual:galley-entry";
  return {
    name: "galley-entry",
    // Lib mode hands the entry over joined to `root`, so match the tail.
    resolveId: (source) => (source.endsWith(id) ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id
        ? `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ${JSON.stringify(here("../../styles/global.css"))};
import { SourcePane } from ${JSON.stringify(here("./SourcePane.tsx"))};
let root = null;
export function mount(source, range) {
  const host = document.getElementById('host');
  if (!root) root = createRoot(host);
  flushSync(() =>
    root.render(
      createElement(SourcePane, {
        source,
        onChange: () => {},
        diagnostics: [],
        selectionRange: range,
        revealToken: 0,
        onCursor: () => {},
        onFormat: () => {},
        formatted: true,
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
    root: here("../../.."),
    plugins: [entry()],
    // Under Vitest NODE_ENV is `test`, so Vite would emit `jsxDEV` calls, which
    // the production React this bundle defines has no implementation for.
    esbuild: { jsx: "automatic", jsxDev: false },
    resolve: { alias: { "@": here("../..") } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: "virtual:galley-entry", formats: ["iife"], name: "Galley", fileName: "galley" },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0].output;
  const js = output.find((o): o is Rollup.OutputChunk => o.type === "chunk");
  const css = output
    .filter((o): o is Rollup.OutputAsset => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  if (!js) throw new Error("vite produced no chunk for SourcePane");
  if (!css.includes("box-shadow")) throw new Error("the galley CSS did not make it into the bundle");
  return { js: js.code, css };
}

beforeAll(async () => {
  chromium = await probeChromium("SourcePane.wax.test", "that the selected-element wax in the galley covers no glyph");
  if (!chromium.available) return;
  const { js, css } = await bundle();
  const fontsDir = here("../../../public/fonts/");
  page = await (
    await getBrowser()
  ).newPage({
    viewport: { width: 900, height: 400 },
    deviceScaleFactor: SCALE,
  });
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/fonts/")) {
      const body = await readFile(fontsDir + path.slice("/fonts/".length)).catch(() => null);
      return body
        ? route.fulfill({ body, contentType: path.endsWith(".ttf") ? "font/ttf" : "font/woff2" })
        : route.fulfill({ status: 404, body: "" });
    }
    return route.fulfill({
      contentType: "text/html",
      body:
        "<!doctype html><html><head><style>html,body{margin:0}#host{width:900px;height:400px}</style></head>" +
        '<body><div id="host"></div></body></html>',
    });
  });
  // React reports a render error to the page, not to `mount()`'s caller.
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
}, 120_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

interface Glyph {
  index: number;
  char: string;
  /** Device-pixel rect of the glyph's cell, inside the screenshot clip. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A device-pixel rectangle inside the screenshot. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Shot {
  ink: number[];
  /** Wax-yellow pixels in the whole shot. */
  wax: number;
  /** Selection-blue pixels in the whole shot, the box around them, and how
   * many pixel columns inside that box hold any (a gap shows as fewer). */
  blue: number;
  blueBox: Box | null;
  blueColumns: number;
}

/**
 * Ink per glyph, as counted from one screenshot of the galley's `<pre>`, and
 * the number of wax-yellow and selection-blue pixels in the whole shot. Those
 * are the guard against a ground that paints nowhere (behind the paper, or
 * under the wax): that covers no glyph either, and would pass the glyph check
 * on its own.
 */
async function inkPerGlyph(png: Buffer, glyphs: Glyph[]): Promise<Shot> {
  return page!.evaluate(
    async ({ data, glyphs }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const all = ctx.getImageData(0, 0, img.width, img.height).data;
      const near = (i: number, [r, g, b]: number[]) =>
        Math.abs(all[i] - r) < 8 && Math.abs(all[i + 1] - g) < 8 && Math.abs(all[i + 2] - b) < 8;
      let wax = 0;
      let blue = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
      const columns = new Set<number>();
      for (let i = 0; i < all.length; i += 4) {
        // --wax is #f5d97a, --non-photo-select #99c5ed.
        if (near(i, [0xf5, 0xd9, 0x7a])) wax += 1;
        if (near(i, [0x99, 0xc5, 0xed])) {
          blue += 1;
          const x = (i / 4) % img.width;
          const y = Math.floor(i / 4 / img.width);
          columns.add(x);
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        }
      }
      const blueBox = blue ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
      const ink = glyphs.map((g) => {
        const { data: px } = ctx.getImageData(g.x, g.y, g.w, g.h);
        let n = 0;
        for (let i = 0; i < px.length; i += 4) {
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          // Wax is ~0.84, the selection's blue ~0.75 and paper 1.0; every
          // galley ink is below 0.45.
          if (lum < 0.6) n += 1;
        }
        return n;
      });
      return { ink, wax, blue, blueBox, blueColumns: columns.size };
    },
    { data: png.toString("base64"), glyphs },
  );
}

/** Mount `source` with `[start, end)` waxed, or nothing waxed for `null`. */
async function mount(source: string, range: [number, number] | null): Promise<void> {
  // A selection left focused by the last case would outlive the new source.
  await page!.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page!.evaluate(
    ({ source, range }) =>
      (
        window as unknown as {
          Galley: { mount: (s: string, r: [number, number] | null) => void };
        }
      ).Galley.mount(source, range),
    { source, range },
  );
  if (pageErrors.length) throw new Error(`the page threw: ${pageErrors.join(" | ")}`);
  await page!.evaluate(() => document.fonts.ready);
}

/**
 * Mount `source` with `range` waxed and `select` selected in the textarea, and
 * return every visible glyph from `margin` before the first of the two to
 * `margin` after the last, with its ink waxed and unwaxed.
 */
async function measure(source: string, range: [number, number] | null, margin = 3, select?: [number, number]) {
  await mount(source, range);
  if (select) await selectText(select);
  const ranges = [range, select].filter((r): r is [number, number] => !!r);
  const from = Math.min(...ranges.map((r) => r[0]));
  const to = Math.max(...ranges.map((r) => r[1]));

  const { clip, glyphs, family } = await page!.evaluate(
    ({ from, to, scale }) => {
      const pre = document.querySelector('pre[class*="highlight"]');
      if (!pre) throw new Error("SourcePane did not render the galley <pre>");
      const box = pre.getBoundingClientRect();
      const glyphs: Glyph[] = [];
      const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
      let offset = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? "";
        for (let i = 0; i < text.length; i += 1) {
          const at = offset + i;
          if (at < from || at >= to || /\s/.test(text[i])) continue;
          const r = document.createRange();
          r.setStart(node, i);
          r.setEnd(node, i + 1);
          const rect = r.getBoundingClientRect();
          glyphs.push({
            index: at,
            char: text[i],
            x: Math.round((rect.left - box.left) * scale),
            y: Math.round((rect.top - box.top) * scale),
            w: Math.round(rect.width * scale),
            h: Math.round(rect.height * scale),
          });
        }
        offset += text.length;
      }
      return {
        clip: { x: box.left, y: box.top, width: box.width, height: box.height },
        glyphs,
        family: getComputedStyle(pre).fontFamily,
      };
    },
    { from: from - margin, to: to + margin, scale: SCALE },
  );

  const waxed = await inkPerGlyph(await page!.screenshot({ clip }), glyphs);
  // The shot's origin in CSS pixels, to compare the blue box with a rect.
  const origin = { x: clip.x, y: clip.y };
  const off = await page!.addStyleTag({
    content:
      "pre, pre * { background: transparent !important; box-shadow: none !important; }" +
      " textarea::selection { background: transparent !important; }",
  });
  const control = await inkPerGlyph(await page!.screenshot({ clip }), glyphs);
  await off.evaluate((el) => (el as Element).remove());

  return {
    family,
    waxCount: await page!.evaluate(() => document.querySelectorAll('pre [class*="wax"]').length),
    waxPixels: { waxed: waxed.wax, control: control.wax },
    bluePixels: { waxed: waxed.blue, control: control.blue },
    /** The blue's bounding box in CSS pixels, page coordinates. */
    blueGapColumns: waxed.blueBox ? waxed.blueBox.w - waxed.blueColumns : 0,
    blueBox: waxed.blueBox && {
      left: origin.x + waxed.blueBox.x / SCALE,
      right: origin.x + (waxed.blueBox.x + waxed.blueBox.w) / SCALE,
      top: origin.y + waxed.blueBox.y / SCALE,
      bottom: origin.y + (waxed.blueBox.y + waxed.blueBox.h) / SCALE,
    },
    glyphs: glyphs.map((g, i) => ({ ...g, waxed: waxed.ink[i], control: control.ink[i] })),
  };
}

/**
 * Focus the galley's textarea and select `[start, end)` in it, the way a drag
 * or Shift+arrows would, then give React the task it renders the change in.
 */
async function selectText([start, end]: [number, number]): Promise<void> {
  await page!.evaluate(
    async ({ start, end }) => {
      const input = document.querySelector("textarea");
      if (!input) throw new Error("SourcePane did not render a <textarea>");
      input.focus();
      const changed = new Promise((resolve) => {
        document.addEventListener("selectionchange", resolve, { once: true, capture: true });
        setTimeout(resolve, 1000);
      });
      input.setSelectionRange(start, end);
      await changed;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    { start, end },
  );
}

/** Glyphs that lost ink to the wax or the selection's blue: under 85% of
 * their unpainted count. Throws if the ground named did not show at all,
 * which would make "none" meaningless. */
function covered(result: Awaited<ReturnType<typeof measure>>, ground: "wax" | "blue" = "wax") {
  const { waxed, control } = ground === "wax" ? result.waxPixels : result.bluePixels;
  if (!(control === 0 && waxed > 2000)) {
    throw new Error(`the ${ground} did not paint: ${waxed} ${ground} pixels painted, ${control} in the control`);
  }
  return result.glyphs
    .filter((g) => g.control > 0 && g.waxed < g.control * 0.85)
    .map((g) => `${JSON.stringify(g.char)}@${g.index} ${g.waxed}/${g.control}`);
}

describe("the selected-element wax in the galley (Chromium)", () => {
  it("runs: the galley font loaded, the wax painted, and every glyph has ink", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Slide><Heading size="xl">Hi</Heading></Slide>';
    const start = source.indexOf("<Heading");
    const result = await measure(source, [start, source.indexOf("</Slide>")]);
    expect(await page!.evaluate(() => document.fonts.check('12.5px "Spline Sans Mono"'))).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(result.family).toMatch(/Spline Sans Mono/);
    expect(result.waxCount).toBeGreaterThan(0);
    // The control must itself see the glyphs, or "no glyph lost ink" is empty.
    expect(result.glyphs.length).toBeGreaterThan(30);
    for (const g of result.glyphs) expect(g.control, `${g.char}@${g.index}`).toBeGreaterThan(0);
  });

  it("covers no glyph inside a mid-line run, at a token boundary, or beside it", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // A glyph sits right against both ends of the run: `>` before, `<` after.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const start = source.indexOf("<Heading");
    const end = source.indexOf("</Slide>");
    expect(covered(await measure(source, [start, end]))).toEqual([]);
  });

  it("covers no glyph in a run from column 0 to the end of a line, over several lines", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Heading size="xl">\n  Say something\n</Heading>\n<Text>after</Text>';
    const end = source.indexOf("\n<Text>");
    expect(covered(await measure(source, [0, end]))).toEqual([]);
  });
});

/** The device-independent box of every line of the selection's ground. */
const groundRects = () =>
  page!.evaluate(() =>
    [...document.querySelectorAll('pre [class*="selectionGround"]')].flatMap((el) =>
      [...el.getClientRects()].map((r) => ({
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
      })),
    ),
  );

/** Every non-blank galley token in `[from, to)`, with its computed ink and
 * weight, and whether it sits in the wax run. */
const tokenStyles = (from: number, to: number) =>
  page!.evaluate(
    ({ from, to }) => {
      const pre = document.querySelector('pre[class*="highlight"]')!;
      const out: Array<{ text: string; color: string; weight: string; inRun: boolean }> = [];
      let offset = 0;
      // The tokens only: the wax run's and the selection's wrappers hold them.
      const tokens = pre.querySelectorAll('span:not([class*="waxRun"]):not([class*="selectionGround"])');
      for (const token of tokens) {
        const text = token.textContent ?? "";
        if (offset >= from && offset < to && text.trim()) {
          const style = getComputedStyle(token);
          out.push({
            text,
            color: style.color,
            weight: style.fontWeight,
            inRun: !!token.closest('[class*="waxRun"]'),
          });
        }
        offset += text.length;
      }
      return out;
    },
    { from, to },
  );

// --graphite is #2b2b2b, --wax-ink #3d3416.
const GRAPHITE = "rgb(43, 43, 43)";
const WAX_INK = "rgb(61, 52, 22)";

describe("a text selection in the galley (Chromium)", () => {
  it("keeps every selected glyph, in graphite on non-photo blue", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // No element is waxed: the selection is off the wax run.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const select: [number, number] = [source.indexOf("<Heading"), source.indexOf("</Slide>")];
    const result = await measure(source, null, 3, select);
    expect(covered(result, "blue")).toEqual([]);
    expect(result.waxPixels.waxed).toBe(0);
    // The ink, read per galley token: every token in the range is graphite,
    // and a component keeps its weight.
    const tokens = await tokenStyles(select[0], select[1]);
    expect(tokens.length).toBeGreaterThan(5);
    expect(new Set(tokens.map((t) => t.color))).toEqual(new Set([GRAPHITE]));
    expect(tokens.find((t) => t.text === "Heading")?.weight).toBe("700");
  });

  it("shows on blue inside the wax run, exactly as wide as its characters", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // The heading is the waxed element; the selection is one word inside it.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const wax: [number, number] = [source.indexOf("<Heading"), source.indexOf("</Slide>")];
    const word = source.indexOf("something");
    const select: [number, number] = [word, word + "something".length];
    const result = await measure(source, wax, 3, select);
    // Both grounds paint, and neither covers a glyph.
    expect(covered(result, "wax")).toEqual([]);
    expect(covered(result, "blue")).toEqual([]);

    // The blue is painted over the wax, not under it: the blue pixels span
    // the selected characters, and stop where they do.
    const chars = await page!.evaluate(
      ({ start, end }) => {
        const pre = document.querySelector('pre[class*="highlight"]')!;
        const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let offset = 0;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const length = node.textContent?.length ?? 0;
          if (start >= offset && start < offset + length) range.setStart(node, start - offset);
          if (end > offset && end <= offset + length) range.setEnd(node, end - offset);
          offset += length;
        }
        const r = range.getBoundingClientRect();
        return { left: r.left, right: r.right };
      },
      { start: select[0], end: select[1] },
    );
    expect(result.blueBox).not.toBeNull();
    expect(Math.abs(result.blueBox!.left - chars.left)).toBeLessThan(1);
    expect(Math.abs(result.blueBox!.right - chars.right)).toBeLessThan(1);

    // Ink: graphite on the selected word, the wax's ink on the rest of the run.
    const tokens = await tokenStyles(wax[0], wax[1]);
    const inWord = tokens.filter((t) => t.text === "something");
    expect(inWord.map((t) => [t.color, t.inRun])).toEqual([[GRAPHITE, true]]);
    const rest = tokens.filter((t) => t.text !== "something");
    expect(rest.length).toBeGreaterThan(5);
    expect(new Set(rest.map((t) => t.color))).toEqual(new Set([WAX_INK]));
  });

  it.for([
    ["into the run", "<Slide", "Heading size"],
    ["out of the run", "something", "/Slide"],
  ] as const)("is one unbroken blue when it crosses %s", async ([, from, to], ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // Split at the run's edge, the selection must not show the run's bleed
    // between its two halves.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const wax: [number, number] = [source.indexOf("<Heading"), source.indexOf("</Slide>")];
    const select: [number, number] = [source.indexOf(from), source.indexOf(to) + to.length];
    const result = await measure(source, wax, 3, select);
    expect(covered(result, "wax")).toEqual([]);
    expect(covered(result, "blue")).toEqual([]);
    expect(await groundRects()).toHaveLength(2);
    expect(result.blueGapColumns).toBe(0);
    const tokens = await tokenStyles(select[0], select[1]);
    expect(new Set(tokens.map((t) => t.color))).toEqual(new Set([GRAPHITE]));
    expect(new Set(tokens.map((t) => t.inRun))).toEqual(new Set([true, false]));
  });

  it("is no taller than the wax run and no wider than its characters", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // The heading is the waxed element; the selection is one word inside it.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const wax: [number, number] = [source.indexOf("<Heading"), source.indexOf("</Slide>")];
    const word = source.indexOf("something");
    const select: [number, number] = [word, word + "something".length];
    expect(covered(await measure(source, wax, 3, select))).toEqual([]);

    const [ground, ...more] = await groundRects();
    expect(more).toEqual([]);
    const { run, chars, line } = await page!.evaluate(
      ({ start, end }) => {
        const pre = document.querySelector('pre[class*="highlight"]')!;
        const box = (r: DOMRect) => ({ left: r.left, right: r.right, height: r.height });
        const run = pre.querySelector('[class*="waxRun"]')!.getBoundingClientRect();
        // The selected characters as the galley set them.
        const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let offset = 0;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const length = node.textContent?.length ?? 0;
          if (start >= offset && start < offset + length) range.setStart(node, start - offset);
          if (end > offset && end <= offset + length) range.setEnd(node, end - offset);
          offset += length;
        }
        return {
          run: box(run),
          chars: box(range.getBoundingClientRect()),
          line: parseFloat(getComputedStyle(pre).lineHeight),
        };
      },
      { start: select[0], end: select[1] },
    );
    expect(ground).toBeDefined();
    expect(Math.abs(ground.height - run.height)).toBeLessThan(0.5);
    expect(ground.height).toBeLessThan(line);
    expect(Math.abs(ground.left - chars.left)).toBeLessThan(0.5);
    expect(Math.abs(ground.right - chars.right)).toBeLessThan(0.5);
  });

  it("keeps each line of a selection over several lines to the height of the text", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Heading size="xl">\n  Say something\n</Heading>\n<Text>after</Text>';
    const select: [number, number] = [3, source.indexOf("</Heading>") + 5];
    expect(covered(await measure(source, null, 3, select), "blue")).toEqual([]);
    const rects = (await groundRects()).filter((r) => r.right > r.left);
    expect(rects.length).toBe(3);
    for (const r of rects) expect(r.height).toBeLessThan(23);
  });

  it("paints nothing for a caret, or once the galley loses focus", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    await mount(source, null);
    await selectText([8, 15]);
    expect(await groundRects()).toHaveLength(1);
    await selectText([10, 10]);
    expect(await groundRects()).toEqual([]);
    await selectText([8, 15]);
    expect(await groundRects()).toHaveLength(1);
    await page!.evaluate(() => document.querySelector("textarea")!.blur());
    await page!.waitForFunction(
      () => document.querySelectorAll('pre [class*="selectionGround"]').length === 0,
      undefined,
      { timeout: 5000 },
    );
  });
});

describe("a text selection anywhere in the chrome (Chromium)", () => {
  it("resolves ::selection to the non-photo blue token, with graphite on it", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const style = await page!.evaluate(() => {
      const p = document.createElement("p");
      p.textContent = "An inspector field";
      document.body.append(p);
      const selection = getComputedStyle(p, "::selection");
      const out = {
        token: getComputedStyle(document.documentElement).getPropertyValue("--non-photo-select").trim(),
        background: selection.backgroundColor,
        color: selection.color,
      };
      p.remove();
      return out;
    });
    expect(style).toEqual({
      token: "#99c5ed",
      background: "rgb(153, 197, 237)",
      color: GRAPHITE,
    });
  });
});

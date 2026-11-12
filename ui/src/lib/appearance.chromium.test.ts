/**
 * The Light / Dark / System switch in real Chromium: the stylesheet's tokens, `color-scheme`, a first visit that
 * ignores the system's dark setting, a reload with no flash, and storage that is blocked.
 *
 * The page is the shipped stylesheet (bundled with Tailwind) and the real inline script from `ui/index.html`. The
 * "no flash" case loads the page with the app's bundle withheld: the theme is there from the inline script alone,
 * before any of the app's JavaScript runs.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { build, type Plugin, type Rollup } from "vite";
import { getBrowser } from "../../../core/src/render/browser.js";
import { probeChromium, type ChromiumGuard } from "../../../core/src/render/test-support/chromium.js";

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>;

const ORIGIN = "http://appearance.test";
const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const inlineScript = /<script>\s*([\s\S]*?)<\/script>/.exec(readFileSync(here("../../index.html"), "utf8"))?.[1] ?? "";

let chromium: ChromiumGuard;
let js = "";
let css = "";

function entry(): Plugin {
  const id = "virtual:appearance-entry";
  return {
    name: "appearance-entry",
    resolveId: (source) => (source.endsWith(id) ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id
        ? `import ${JSON.stringify(here("../styles/index.css"))};
import * as appearance from ${JSON.stringify(here("./appearance.ts"))};
window.appearance = appearance;
appearance.initAppearance();`
        : null,
  };
}

beforeAll(async () => {
  chromium = await probeChromium("appearance.chromium.test", "that the Light / Dark / System switch paints the chrome");
  if (!chromium.available) return;
  const result = (await build({
    configFile: false,
    logLevel: "silent",
    root: here("../.."),
    plugins: [tailwindcss(), entry()],
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: "virtual:appearance-entry", formats: ["iife"], name: "AppearanceTest", fileName: "a" },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0].output;
  js = output.find((o): o is Rollup.OutputChunk => o.type === "chunk")?.code ?? "";
  css = output
    .filter((o): o is Rollup.OutputAsset => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  if (!js || !css) throw new Error("the appearance bundle is empty");
}, 120_000);

afterAll(async () => {
  await chromium.close();
});

/** A page at `/` (inline script, stylesheet, bundle) or `/nobundle` (inline script and stylesheet only). */
async function open(options: {
  colorScheme?: "dark" | "light";
  stored?: string;
  blockStorage?: boolean;
}): Promise<Page> {
  const page = await (await getBrowser()).newPage({ colorScheme: options.colorScheme ?? "light" });
  if (options.blockStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
  } else if (options.stored) {
    await page.addInitScript((value) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("newspapper-appearance", value);
        sessionStorage.setItem("seeded", "1");
      }
    }, options.stored);
  }
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const bundle = path === "/nobundle" ? "" : `<script>${js}</script>`;
    return route.fulfill({
      contentType: "text/html",
      body:
        '<!doctype html><html><head><meta name="theme-color" content="#fbfbf9" />' +
        `<script>${inlineScript}</script><style>${css}</style></head><body><p id="p">Board</p>${bundle}</body></html>`,
    });
  });
  return page;
}

const read = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    return {
      theme: root.dataset["theme"],
      scheme: getComputedStyle(root).colorScheme,
      board: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.body).color,
      token: getComputedStyle(root).getPropertyValue("--color-graphite").trim(),
    };
  });

const LIGHT = {
  theme: "light",
  scheme: "light",
  board: "rgb(251, 251, 249)",
  ink: "rgb(43, 43, 43)",
  token: "#2b2b2b",
};
const DARK = { theme: "dark", scheme: "dark", board: "rgb(27, 28, 31)", ink: "rgb(236, 235, 230)", token: "#ecebe6" };

describe("the Light / Dark / System switch (Chromium)", () => {
  it("a first visit shows the light theme, though the browser asks for dark", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const page = await open({ colorScheme: "dark" });
    try {
      await page.goto(`${ORIGIN}/`);
      expect(await read(page)).toEqual(LIGHT);
    } finally {
      await page.close();
    }
  });

  it("Light sets data-theme=light and the light tokens; Dark sets data-theme=dark, color-scheme: dark and the dark tokens", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const page = await open({});
    try {
      await page.goto(`${ORIGIN}/`);
      await page.evaluate(() =>
        (window as unknown as { appearance: { applyAppearance(c: string): void } }).appearance.applyAppearance("dark"),
      );
      expect(await read(page)).toEqual(DARK);
      await page.evaluate(() =>
        (window as unknown as { appearance: { applyAppearance(c: string): void } }).appearance.applyAppearance("light"),
      );
      expect(await read(page)).toEqual(LIGHT);
    } finally {
      await page.close();
    }
  });

  it("System follows prefers-color-scheme, and a live change of it", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const page = await open({ colorScheme: "light" });
    try {
      await page.goto(`${ORIGIN}/`);
      await page.evaluate(() =>
        (window as unknown as { appearance: { applyAppearance(c: string): void } }).appearance.applyAppearance(
          "system",
        ),
      );
      expect((await read(page)).theme).toBe("light");
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForFunction(() => document.documentElement.dataset["theme"] === "dark");
      expect(await read(page)).toEqual(DARK);
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForFunction(() => document.documentElement.dataset["theme"] === "light");
      expect(await read(page)).toEqual(LIGHT);
    } finally {
      await page.close();
    }
  });

  it("the choice survives a reload, and the theme is there before any of the app's script runs (no flash)", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const page = await open({ stored: "dark" });
    try {
      await page.goto(`${ORIGIN}/nobundle`);
      expect(await read(page)).toEqual(DARK);
      await page.reload();
      expect(await read(page)).toEqual(DARK);
      expect(await page.evaluate(() => typeof (window as unknown as { appearance?: unknown }).appearance)).toBe(
        "undefined",
      );
      expect(await page.getAttribute('meta[name="theme-color"]', "content")).toBe("#1b1c1f");
    } finally {
      await page.close();
    }
  });

  it("with storage blocked the page still renders, in light", async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const page = await open({ colorScheme: "dark", blockStorage: true });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(`${ORIGIN}/`);
      expect(await read(page)).toEqual(LIGHT);
      expect(errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
});

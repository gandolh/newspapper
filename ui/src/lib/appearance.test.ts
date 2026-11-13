// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import html from "../../index.html?raw";
import css from "../styles/index.css?inline";
import {
  APPEARANCE_KEY,
  applyAppearance,
  initAppearance,
  readAppearance,
  resolveAppearance,
  THEME_COLOR,
} from "./appearance";

type Listener = () => void;

/** A controllable `prefers-color-scheme: dark`. */
function stubSystem(initial: boolean) {
  const state = { dark: initial, listeners: new Set<Listener>() };
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return state.dark;
    },
    addEventListener: (_type: string, fn: Listener) => state.listeners.add(fn),
    removeEventListener: (_type: string, fn: Listener) => state.listeners.delete(fn),
  }));
  return {
    set(dark: boolean) {
      state.dark = dark;
      for (const fn of [...state.listeners]) fn();
    },
    listeners: () => state.listeners.size,
  };
}

const theme = () => document.documentElement.dataset["theme"];

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset["theme"];
  document.head.innerHTML = '<meta name="theme-color" content="#e9e8e3" />';
});

afterEach(() => {
  applyAppearance("light", { store: false });
  vi.unstubAllGlobals();
});

describe("the Light / Dark / System choice", () => {
  it("Light sets data-theme=light and stores the choice", () => {
    stubSystem(true);
    applyAppearance("light");
    expect(theme()).toBe("light");
    expect(window.localStorage.getItem(APPEARANCE_KEY)).toBe("light");
  });

  it("Dark sets data-theme=dark and the dark browser colour", () => {
    stubSystem(false);
    applyAppearance("dark");
    expect(theme()).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(THEME_COLOR.dark);
  });

  it("System follows the OS setting, and a live change of it, only while System is chosen", () => {
    const system = stubSystem(false);
    applyAppearance("system");
    expect(theme()).toBe("light");
    system.set(true);
    expect(theme()).toBe("dark");
    system.set(false);
    expect(theme()).toBe("light");

    applyAppearance("dark");
    expect(system.listeners()).toBe(0);
    system.set(false);
    expect(theme()).toBe("dark");
  });

  it("a first visit (empty storage) is light, though the browser prefers dark", () => {
    stubSystem(true);
    expect(readAppearance()).toBe("light");
    initAppearance();
    expect(theme()).toBe("light");
    expect(window.localStorage.getItem(APPEARANCE_KEY)).toBeNull();
  });

  it("the stored choice survives a reload", () => {
    stubSystem(false);
    applyAppearance("dark");
    delete document.documentElement.dataset["theme"];
    initAppearance();
    expect(theme()).toBe("dark");
  });

  it("an unknown stored value reads as light", () => {
    window.localStorage.setItem(APPEARANCE_KEY, "sepia");
    expect(readAppearance()).toBe("light");
  });

  it("with storage blocked it still paints, in light", () => {
    stubSystem(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAppearance()).toBe("light");
    initAppearance();
    expect(theme()).toBe("light");
    expect(() => applyAppearance("dark")).not.toThrow();
    expect(theme()).toBe("dark");
    vi.restoreAllMocks();
  });

  it("resolves System without matchMedia to light", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(resolveAppearance("system")).toBe("light");
  });
});

describe("the inline script in index.html", () => {
  const script = /<script>\s*([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";

  /** Runs the page's script against a stored value and a system setting; returns what it painted. */
  function bootWith(stored: string | null, systemDark: boolean): { theme: string | undefined; color: string | null } {
    stubSystem(systemDark);
    window.localStorage.clear();
    if (stored !== null) window.localStorage.setItem(APPEARANCE_KEY, stored);
    delete document.documentElement.dataset["theme"];
    document.head.innerHTML = '<meta name="theme-color" content="#e9e8e3" />';
    new Function(script)();
    return {
      theme: theme(),
      color: document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null,
    };
  }

  it("has the script, before the bundle", () => {
    expect(script).toContain("newspapper-appearance");
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('type="module"'));
  });

  it.each([
    [null, false],
    [null, true],
    ["light", true],
    ["dark", false],
    ["system", true],
    ["system", false],
    ["nonsense", true],
  ] as const)("paints what readAppearance and applyAppearance paint (stored %s, system dark %s)", (stored, dark) => {
    const booted = bootWith(stored, dark);
    stubSystem(dark);
    window.localStorage.clear();
    if (stored !== null) window.localStorage.setItem(APPEARANCE_KEY, stored);
    delete document.documentElement.dataset["theme"];
    initAppearance();
    expect(booted.theme).toBe(theme());
    expect(booted.color).toBe(document.querySelector('meta[name="theme-color"]')?.getAttribute("content"));
  });

  it("paints light when storage throws", () => {
    stubSystem(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    delete document.documentElement.dataset["theme"];
    new Function(script)();
    expect(theme()).toBe("light");
    vi.restoreAllMocks();
  });

  it("keeps the browser colour in step with the stylesheet's board, in both themes", () => {
    const light = /--color-board:\s*(#[0-9a-f]{6})/i.exec(css)?.[1];
    const dark = /\[data-theme="dark"\][^}]*--color-board:\s*(#[0-9a-f]{6})/is.exec(css)?.[1];
    expect(light).toBe(THEME_COLOR.light);
    expect(dark).toBe(THEME_COLOR.dark);
    expect(html).toContain(`content="${THEME_COLOR.light}"`);
    expect(script).toContain(THEME_COLOR.dark);
  });
});

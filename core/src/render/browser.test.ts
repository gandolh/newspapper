/**
 * Two leaks on the shared, long-lived Chromium: concurrent launches
 * orphaning a browser, and a render whose setup failed leaving its context open.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { chromium, type Browser } from "playwright";

import { closeBrowser, getBrowser, useBrowser } from "./browser.js";
import { RenderTimeoutError, renderInBrowser } from "./screenshot.js";
import { probeChromium } from "./test-support/chromium.js";

const guard = await probeChromium("browser.test", "that concurrent launches share one browser");
afterAll(() => guard.close());

describe("getBrowser", () => {
  it("concurrent callers share one launch, and close leaves nothing running", async (ctx) => {
    if (!guard.orSkip((note) => ctx.skip(note))) return;
    await closeBrowser();
    const launch = vi.spyOn(chromium, "launch");
    try {
      const [a, b, c] = await Promise.all([getBrowser(), getBrowser(), getBrowser()]);
      expect(launch).toHaveBeenCalledTimes(1);
      expect(b).toBe(a);
      expect(c).toBe(a);
      await closeBrowser();
      expect(a.isConnected()).toBe(false);
    } finally {
      launch.mockRestore();
    }
  });

  it("close waits for a launch still in flight and closes it too", async (ctx) => {
    if (!guard.orSkip((note) => ctx.skip(note))) return;
    await closeBrowser();
    const pending = getBrowser();
    await closeBrowser();
    expect((await pending).isConnected()).toBe(false);
  });
});

describe("renderInBrowser cleanup", () => {
  function fakeBrowser(failAt: "route" | "newPage" | "setContent") {
    const page = {
      setContent: vi.fn(async () => {
        if (failAt === "setContent") throw new Error("setContent failed");
      }),
      evaluate: vi.fn(async () => true),
      close: vi.fn(async () => undefined),
    };
    const context = {
      route: vi.fn(async () => {
        if (failAt === "route") throw new Error("route install failed");
      }),
      newPage: vi.fn(async () => {
        if (failAt === "newPage") throw new Error("newPage failed");
        return page;
      }),
      close: vi.fn(async () => undefined),
    };
    const browser = { newContext: vi.fn(async () => context) } as unknown as Pick<Browser, "newContext">;
    return { browser, context, page };
  }

  for (const failAt of ["route", "newPage", "setContent"] as const) {
    it(`closes the context when ${failAt} throws`, async () => {
      const { browser, context, page } = fakeBrowser(failAt);
      await expect(renderInBrowser(browser, "<p>x</p>", 100, 100, async () => "never")).rejects.toThrow(/failed/);
      expect(context.close).toHaveBeenCalledTimes(1);
      if (failAt === "setContent") expect(page.close).toHaveBeenCalledTimes(1);
    });
  }
});

describe("renderInBrowser timeouts", () => {
  const never = () => new Promise<never>(() => undefined);

  for (const stuck of ["setContent", "evaluate"] as const) {
    it(`a ${stuck} that never settles rejects within its budget and closes everything`, async () => {
      const page = {
        setContent: vi.fn(stuck === "setContent" ? never : async () => undefined),
        evaluate: vi.fn(stuck === "evaluate" ? never : async () => true),
        close: vi.fn(async () => undefined),
      };
      const context = {
        route: vi.fn(async () => undefined),
        newPage: vi.fn(async () => page),
        close: vi.fn(async () => undefined),
      };
      const browser = { newContext: vi.fn(async () => context) } as unknown as Pick<Browser, "newContext">;
      const started = Date.now();
      await expect(
        renderInBrowser(browser, "<p>x</p>", 100, 100, async () => "never", undefined, {
          settleMs: 50,
          fontsMs: 50,
        }),
      ).rejects.toBeInstanceOf(RenderTimeoutError);
      expect(Date.now() - started).toBeLessThan(1_000);
      expect(page.close).toHaveBeenCalledTimes(1);
      expect(context.close).toHaveBeenCalledTimes(1);
    });
  }

  it("passes the budget to Playwright as well", async () => {
    const setContent = vi.fn(async () => undefined);
    const page = {
      setContent,
      evaluate: vi.fn(async () => true),
      close: vi.fn(async () => undefined),
    };
    const context = {
      route: vi.fn(async () => undefined),
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => undefined),
    };
    const browser = { newContext: vi.fn(async () => context) } as unknown as Pick<Browser, "newContext">;
    await renderInBrowser(browser, "<p>x</p>", 100, 100, async () => "ok");
    expect(setContent).toHaveBeenCalledWith("<p>x</p>", expect.objectContaining({ timeout: 20_000 }));
  });
});

describe("useBrowser idle close", () => {
  // A fake browser, so fake timers can run without touching Playwright's own.
  function fakeLaunch() {
    const made: { connected: boolean; close: ReturnType<typeof vi.fn> }[] = [];
    const launch = vi.spyOn(chromium, "launch").mockImplementation((async () => {
      const b = {
        connected: true,
        close: vi.fn(async () => {
          b.connected = false;
        }),
        isConnected: () => b.connected,
      };
      made.push(b);
      return b as unknown as Browser;
    }) as unknown as typeof chromium.launch);
    return { made, launch };
  }

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await closeBrowser();
  });

  it("closes after the idle time, and the next render launches a new one", async () => {
    await closeBrowser();
    vi.useFakeTimers();
    const { made, launch } = fakeLaunch();
    await useBrowser(async () => "one", 1_000);
    expect(made[0]?.connected).toBe(true);
    await vi.advanceTimersByTimeAsync(999);
    expect(made[0]?.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
    await useBrowser(async () => "two", 1_000);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("keeps the browser while a render is still running when the time would end", async () => {
    await closeBrowser();
    vi.useFakeTimers();
    const { made } = fakeLaunch();
    await useBrowser(async () => "warm", 1_000);
    let finish!: () => void;
    const running = useBrowser(() => new Promise<void>((r) => (finish = r)), 1_000);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(made).toHaveLength(1);
    expect(made[0]?.close).not.toHaveBeenCalled();
    finish();
    await running;
    await vi.advanceTimersByTimeAsync(1_001);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("a render arriving just as the timer fires keeps the browser it joined", async () => {
    await closeBrowser();
    vi.useFakeTimers();
    const { made, launch } = fakeLaunch();
    await useBrowser(async () => "warm", 1_000);
    await vi.advanceTimersByTimeAsync(999);
    let finish!: () => void;
    // Started one tick before the timer: it cancels the timer and holds the browser.
    const joined = useBrowser(() => new Promise<void>((r) => (finish = r)), 1_000);
    await vi.advanceTimersByTimeAsync(10);
    expect(made[0]?.close).not.toHaveBeenCalled();
    finish();
    await joined;
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("two renders started together share one launch", async () => {
    await closeBrowser();
    const { launch } = fakeLaunch();
    const [a, b] = await Promise.all([useBrowser(async (x) => x), useBrowser(async (x) => x)]);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("after the idle time a real render closes Chromium and the next one launches again", async (ctx) => {
    if (!guard.orSkip((note) => ctx.skip(note))) return;
    await closeBrowser();
    const first = await useBrowser(async (b) => b, 50);
    expect(first.isConnected()).toBe(true);
    await new Promise((r) => setTimeout(r, 400));
    expect(first.isConnected()).toBe(false);
    const second = await useBrowser(async (b) => b, 50);
    expect(second).not.toBe(first);
    expect(second.isConnected()).toBe(true);
  });
});

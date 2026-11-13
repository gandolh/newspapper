/**
 * The Floor, per screen: a visible focus ring on every Tab stop, no running animation or transition under
 * `prefers-reduced-motion: reduce`, no sideways overflow at phone widths, and the Light / Dark / System switch with
 * a light first visit. Every screen runs on the stubbed API of `fixtures.ts`.
 */
import { expect, test, type Page } from "@playwright/test";
import { settle, stubApi } from "./fixtures";

const SCREENS = [
  { name: "editor", path: "/?post=1" },
  { name: "posts", path: "/posts" },
  { name: "reader", path: "/reader" },
  { name: "settings", path: "/settings" },
  { name: "login", path: "/login", signedOut: true },
] as const;

async function open(page: Page, screen: (typeof SCREENS)[number]) {
  const stub = await stubApi(page, { signedOut: "signedOut" in screen });
  await page.goto(screen.path);
  await settle(page);
  return stub;
}

test.describe("focus ring", () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: every Tab stop shows a ring`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page, screen);
      const bare: string[] = [];
      let stops = 0;
      for (let i = 0; i < 80; i += 1) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring =
            cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
          const label = `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 24) ?? ""}`;
          return { ring, label };
        });
        if (stop === null) break;
        stops += 1;
        if (!stop.ring) bare.push(stop.label);
      }
      expect(stops).toBeGreaterThan(1);
      expect(bare).toEqual([]);
    });
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  for (const screen of SCREENS) {
    test(`${screen.name}: nothing runs`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page, screen);
      await page.waitForTimeout(400);
      const running = await page.evaluate(() => {
        const animations = document
          .getAnimations()
          .filter((a) => a.playState === "running")
          .map((a) => a.id || a.constructor.name);
        const longest = (value: string): number =>
          Math.max(0, ...value.split(",").map((v) => parseFloat(v) * (v.trim().endsWith("ms") ? 1 : 1000)));
        const slow = Array.from(document.querySelectorAll("*")).filter((el) => {
          const cs = getComputedStyle(el);
          return longest(cs.transitionDuration) > 0.1 || longest(cs.animationDuration) > 0.1;
        });
        return { animations, slow: slow.map((el) => el.tagName.toLowerCase()) };
      });
      expect(running).toEqual({ animations: [], slow: [] });
    });
  }
});

test.describe("phone widths", () => {
  for (const width of [390, 360]) {
    for (const screen of SCREENS) {
      test(`${screen.name} at ${width}: no sideways overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, screen);
        const widths = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          inner: window.innerWidth,
        }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
      });
    }
  }
});

test.describe("the Light / Dark / System switch", () => {
  test.use({ colorScheme: "dark" });

  test("a first visit is light though the browser asks for dark", async ({ page }) => {
    await open(page, SCREENS[0]);
    expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe("light");
  });

  test("Dark, System and Light in Settings change the board and persist", async ({ page }) => {
    await open(page, SCREENS[3]);
    const board = (): Promise<string> => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const group = page.getByRole("radiogroup", { name: "Appearance" });
    await group.getByRole("radio", { name: "Dark" }).click();
    expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe("dark");
    expect(await board()).toBe("rgb(18, 19, 21)");
    await page.reload();
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe("dark");
    await page.getByRole("radiogroup", { name: "Appearance" }).getByRole("radio", { name: "System" }).click();
    expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset["theme"])).toBe("light");
    await page.getByRole("radiogroup", { name: "Appearance" }).getByRole("radio", { name: "Light" }).click();
    expect(await board()).toBe("rgb(233, 232, 227)");
  });
});

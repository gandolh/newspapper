/**
 * What the first screen holds, measured: how many Reader items are whole above the fold, and whether the editor's
 * first slide is whole above the phone's bottom bar with the strip showing under it.
 */
import { expect, test, type Page } from "@playwright/test";
import { settle, stubApi } from "./fixtures";

/** The lowest y a reader can see: the window's foot, or the top of the bottom bar when there is one. */
async function floor(page: Page): Promise<number> {
  return page.evaluate(() => {
    const bar = document.querySelector("nav[aria-label='Places']");
    const barTop = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().top : Infinity;
    return Math.min(window.innerHeight, barTop);
  });
}

const READER = [
  { width: 1280, height: 800, whole: 8 },
  { width: 390, height: 844, whole: 7 },
  { width: 360, height: 800, whole: 6 },
] as const;

for (const size of READER) {
  test(`reader at ${size.width}x${size.height}: ${size.whole} items are whole above the fold`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await stubApi(page);
    await page.goto("/reader");
    await settle(page);
    const lowest = await floor(page);
    const whole = await page.evaluate((limit) => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-item-id]"));
      const box = rows[0]?.closest("ul")?.parentElement?.getBoundingClientRect();
      const bottom = Math.min(limit, box && box.bottom > 0 ? box.bottom : limit);
      return rows.filter((row) => {
        const r = row.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= bottom + 0.5;
      }).length;
    }, lowest);
    expect(whole).toBeGreaterThanOrEqual(size.whole);
  });
}

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(`editor at ${size.width}x${size.height}: slide 1 is whole above the bottom bar, the strip shows under it`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await stubApi(page);
    await page.goto("/?post=1");
    await settle(page);
    const lowest = await floor(page);
    const box = await page.evaluate(() => {
      const group = document.querySelector("[aria-label='All slides']")!.getBoundingClientRect();
      const label = Array.from(document.querySelectorAll("div")).find((d) => d.textContent === "1080 × 1080");
      const slide = label?.nextElementSibling?.getBoundingClientRect();
      return { slideBottom: slide?.bottom ?? 0, stripTop: group.top };
    });
    expect(box.slideBottom).toBeLessThanOrEqual(lowest);
    expect(box.stripTop).toBeLessThan(lowest);
  });
}

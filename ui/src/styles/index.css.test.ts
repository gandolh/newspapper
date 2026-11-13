import { describe, expect, it } from "vitest";
import css from "./index.css?inline";

/** A class selector as the stylesheet writes it, not a longer name that starts with it. */
const has = (name: string): boolean => new RegExp(`\\.${name.replace(/[^\w-]/g, "\\\\$&")}(?![\\w-])`).test(css);

describe("the stylesheet's closed system", () => {
  it("defines the chrome's own tokens", () => {
    for (const token of [
      "--color-board",
      "--color-wax",
      "--spacing-unit",
      "--text-label",
      "--tracking-brand",
      "--color-field-edge",
      "--text-head",
      "--spacing-card",
    ]) {
      expect(css, token).toContain(`${token}:`);
    }
  });

  it("generates no rule for a default Tailwind colour, size or radius", () => {
    // These strings are in the source on purpose: Tailwind scans them, and the cleared scales leave no rule.
    const probes = ["bg-red-500", "text-sm", "rounded-md", "shadow-lg", "p-4", "font-sans", "text-red-500"];
    for (const probe of probes) expect(has(probe), probe).toBe(false);
  });

  it("keeps zero as the one numeric spacing, since inset-0 and p-0 need it", () => {
    for (const used of ["inset-0", "top-0", "p-0"]) expect(has(used), used).toBe(true);
  });

  it("keeps the render's reset, and no Preflight", () => {
    expect(css).toMatch(/box-sizing:\s*border-box/);
    expect(css).not.toMatch(/border:\s*0 solid/);
  });

  it("puts the root size on body, not on html", () => {
    const html = /(^|[^\w-])html\s*\{[^}]*\}/g;
    for (const rule of css.match(html) ?? []) expect(rule).not.toContain("font-size");
    expect(css).toMatch(/body\s*\{[^}]*font-size:\s*var\(--text-body\)/);
  });
});

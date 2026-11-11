/**
 * The themes route, through the whole app (guard included), with a signed-in session.
 */
import { describe, expect, it } from "vitest";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Themes
// =========================================================================
describe("GET /api/themes", () => {
  it("returns array with warm-industrial-1", async () => {
    const res = await inject({ method: "GET", url: "/api/themes" });
    expect(res.statusCode).toBe(200);
    const themes = res.json<Array<{ name: string; tokens: unknown }>>();
    expect(Array.isArray(themes)).toBe(true);
    const names = themes.map((t) => t.name);
    expect(names).toContain("warm-industrial-1");
  });
});

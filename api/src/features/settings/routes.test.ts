/**
 * The settings routes, through the whole app (guard included), with a signed-in session.
 */
import { describe, expect, it } from "vitest";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Settings
// =========================================================================
describe("GET /api/settings", () => {
  it("returns settings with defaultTheme", async () => {
    const res = await inject({ method: "GET", url: "/api/settings" });
    expect(res.statusCode).toBe(200);
    const s = res.json();
    expect(typeof s.defaultTheme).toBe("string");
  });
});

describe("PUT /api/settings", () => {
  it("persists a defaultTheme patch", async () => {
    await inject({
      method: "PUT",
      url: "/api/settings",
      payload: { defaultTheme: "warm-industrial-1" },
    });
    const res = await inject({ method: "GET", url: "/api/settings" });
    expect(res.json().defaultTheme).toBe("warm-industrial-1");
  });

  it("400 on a theme that is not on disk, leaving the stored one alone", async () => {
    const res = await inject({
      method: "PUT",
      url: "/api/settings",
      payload: { defaultTheme: "no-such-theme" },
    });
    expect(res.statusCode).toBe(400);
    const after = await inject({ method: "GET", url: "/api/settings" });
    expect(after.json().defaultTheme).toBe("warm-industrial-1");
  });
});

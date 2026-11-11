/**
 * Search over SSE, through the whole app (guard included), with a signed-in session.
 */
import { describe, expect, it } from "vitest";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Scrape (SSE)
// =========================================================================
describe("POST /api/scrape", () => {
  it("errors over SSE when no keywords are given", async () => {
    const res = await inject({ method: "POST", url: "/api/scrape", payload: {} });
    expect(res.body).toContain("event: error");
  });

  // The keyword-match ranking and the "nothing is persisted" guarantee are
  // covered against mocked feeds in core/src/scrape/scrape.test.ts — a real
  // scrape here would hit the network via the seeded data/sources.json rows.
});

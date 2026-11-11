/**
 * The source routes, through the whole app (guard included), with a signed-in session.
 */
import { describe, expect, it } from "vitest";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Sources
// =========================================================================
describe("GET /api/sources", () => {
  it("returns an array", async () => {
    const res = await inject({ method: "GET", url: "/api/sources" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe("POST /api/sources validation", () => {
  it("400 when id missing", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/sources",
      payload: { name: "Test", rss: "https://example.com/feed" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400 when rss missing", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/sources",
      payload: { id: "test-src", name: "Test" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400 when category is not text", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/sources",
      payload: { id: "bad-cat", name: "Bad", rss: "https://example.com/feed", category: 3 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("source categories", () => {
  it("accepts and returns a category on create and update; blank means none", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/sources",
      payload: {
        id: "cat-src",
        name: "Categorised",
        rss: "https://example.com/cat.xml",
        category: " Economie ",
      },
    });
    expect(created.statusCode).toBe(201);
    const find = (all: Array<{ id: string }>) => all.find((s) => s.id === "cat-src");
    expect(find(created.json())).toMatchObject({
      category: "Economie",
      lastFetchedAt: null,
      lastError: null,
    });

    const renamed = await inject({
      method: "PUT",
      url: "/api/sources/cat-src",
      payload: { category: "Politică" },
    });
    expect(find(renamed.json())).toMatchObject({ category: "Politică", name: "Categorised" });

    const cleared = await inject({
      method: "PUT",
      url: "/api/sources/cat-src",
      payload: { category: "" },
    });
    expect(find(cleared.json())).toMatchObject({ category: null });

    const listed = await inject({ method: "GET", url: "/api/sources" });
    expect(find(listed.json())).toMatchObject({ category: null });

    const bad = await inject({
      method: "PUT",
      url: "/api/sources/cat-src",
      payload: { category: ["x"] },
    });
    expect(bad.statusCode).toBe(400);

    await inject({ method: "DELETE", url: "/api/sources/cat-src" });
  });

  it("a source created without a category is uncategorized", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/sources",
      payload: { id: "plain-src", name: "Plain", rss: "https://example.com/plain.xml" },
    });
    expect(created.json().find((s: { id: string }) => s.id === "plain-src").category).toBeNull();
    await inject({ method: "DELETE", url: "/api/sources/plain-src" });
  });
});

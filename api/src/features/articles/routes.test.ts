/**
 * The saved library's routes, through the whole app (guard included), with a signed-in session.
 */
import { describe, expect, it } from "vitest";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Articles
// =========================================================================
describe("GET /api/articles", () => {
  it("returns an array", async () => {
    const res = await inject({ method: "GET", url: "/api/articles" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("filters by sourceId and search", async () => {
    await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Budget day", body: "about tax and spend", sourceName: "BBC" },
    });
    const bySearch = await inject({ method: "GET", url: "/api/articles?search=tax" });
    expect(bySearch.statusCode).toBe(200);
    const titles = bySearch.json<Array<{ title: string }>>().map((a) => a.title);
    expect(titles).toContain("Budget day");

    const bySource = await inject({
      method: "GET",
      url: "/api/articles?sourceId=no-such-source",
    });
    expect(bySource.json()).toEqual([]);
  });
});

describe("POST /api/articles", () => {
  it("400 when title missing", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { body: "some content" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty("error");
  });

  it("201 with just a title — body defaults to empty", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Test article" },
    });
    expect(res.statusCode).toBe(201);
    const article = res.json();
    expect(article.title).toBe("Test article");
    expect(article.body).toBe("");
  });

  it("201 with valid title and body, defaulting sourceName to Manual", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Manual test article", body: "Test body content" },
    });
    expect(res.statusCode).toBe(201);
    const article = res.json();
    expect(article).toHaveProperty("id");
    expect(article.title).toBe("Manual test article");
    expect(article.sourceId).toBeNull();
    expect(article.sourceName).toBe("Manual");
  });

  it("stores a note, and 400 when the note is not text", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Noted", guid: "noted-1", note: "  why I kept it  " },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().note).toBe("why I kept it");

    const bad = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Bad note", note: 7 },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("is idempotent on (source_id, guid) — saving twice leaves one row", async () => {
    const payload = { title: "Dup test", sourceId: "bbc", guid: "dup-1" };
    const first = await inject({ method: "POST", url: "/api/articles", payload });
    const second = await inject({ method: "POST", url: "/api/articles", payload });
    expect(first.json().id).toBe(second.json().id);
  });
});

describe("PATCH /api/articles/:id", () => {
  it("replaces the note, and the library list returns it", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Note me", guid: "note-me" },
    });
    const { id, note } = created.json();
    expect(note).toBe("");

    const res = await inject({
      method: "PATCH",
      url: `/api/articles/${id}`,
      payload: { note: "a quote for the intro slide" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id, note: "a quote for the intro slide" });

    const listed = await inject({ method: "GET", url: "/api/articles?search=Note me" });
    expect(listed.json()[0].note).toBe("a quote for the intro slide");
  });

  it("404 for an unknown article, 400 without a string note", async () => {
    const missing = await inject({
      method: "PATCH",
      url: "/api/articles/999999",
      payload: { note: "x" },
    });
    expect(missing.statusCode).toBe(404);
    const bad = await inject({ method: "PATCH", url: "/api/articles/1", payload: {} });
    expect(bad.statusCode).toBe(400);
    const malformed = await inject({
      method: "PATCH",
      url: "/api/articles/abc",
      payload: { note: "x" },
    });
    expect(malformed.statusCode).toBe(400);
  });
});

describe("DELETE /api/articles/:id", () => {
  it("404 for a non-existent article", async () => {
    const res = await inject({ method: "DELETE", url: "/api/articles/999999" });
    expect(res.statusCode).toBe(404);
  });

  it("deletes a saved article", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "To delete", guid: "delete-me" },
    });
    const { id } = created.json();
    const res = await inject({ method: "DELETE", url: `/api/articles/${id}` });
    expect(res.statusCode).toBe(200);
    const after = await inject({ method: "GET", url: "/api/articles?search=To delete" });
    expect(after.json()).toEqual([]);
  });
});

describe("a malformed article request", () => {
  it("answers 400 with the error body, and saves nothing", async () => {
    for (const [payload, error] of [
      [{ title: 5 }, "title is required"],
      [{ title: "Typed", guid: 9 }, "guid must be a string"],
      [["Typed"], "title is required"],
    ] as const) {
      const res = await inject({ method: "POST", url: "/api/articles", payload });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error });
    }
    expect((await inject({ method: "GET", url: "/api/articles?search=Typed" })).json()).toEqual([]);
  });

  it("answers a limit that isn't an integer with 400, where the database used to fail with a 500", async () => {
    const res = await inject({ method: "GET", url: "/api/articles?limit=abc" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "limit must be an integer" });
  });
});

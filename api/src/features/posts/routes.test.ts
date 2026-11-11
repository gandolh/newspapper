/**
 * The post routes and publish, through the whole app (guard included), with a signed-in session.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordRender } from "@newspapper/core";
import { describe, expect, it } from "vitest";
import { db as appDb } from "../../lib/db.js";
import { useSignedInApp } from "../../testing/signedInApp.js";

const { inject } = useSignedInApp();

// =========================================================================
// Posts
// =========================================================================
describe("GET /api/posts", () => {
  it("returns an array", async () => {
    const res = await inject({ method: "GET", url: "/api/posts" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe("GET /api/posts/:id", () => {
  it("404 for non-existent post", async () => {
    const res = await inject({ method: "GET", url: "/api/posts/999999" });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/posts + PUT /api/posts/:id", () => {
  const markup = `<head>
<title>A saved post</title>
<description>Derived, not sent.</description>
<keywords>budget, tax</keywords>
</head>

<body>
<Slide>
  <Heading>A saved post</Heading>
</Slide>
</body>
`;

  it("400 when the body carries no markup", async () => {
    const res = await inject({ method: "POST", url: "/api/posts", payload: { theme: "x" } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/markup/);
  });

  it("derives the index columns from the markup head", async () => {
    const created = await inject({ method: "POST", url: "/api/posts", payload: { markup } });
    expect(created.statusCode).toBe(201);
    const post = created.json();
    expect(post.title).toBe("A saved post");
    expect(post.description).toBe("Derived, not sent.");
    expect(post.keywords.sort()).toEqual(["budget", "tax"]);
    expect(post.markup).toBe(markup);

    const renamed = markup.replace("<title>A saved post</title>", "<title>Renamed</title>");
    const updated = await inject({
      method: "PUT",
      url: `/api/posts/${post.id}`,
      payload: { markup: renamed },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().title).toBe("Renamed");

    const removed = await inject({ method: "DELETE", url: `/api/posts/${post.id}` });
    expect(removed.statusCode).toBe(200);
  });

  it("falls back rather than refusing a half-typed head", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup: "<body>\n  <Slide />\n</body>\n" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe("Untitled post");
    await inject({ method: "DELETE", url: `/api/posts/${res.json().id}` });
  });

  it("400 when markup is missing on an update", async () => {
    const res = await inject({ method: "PUT", url: "/api/posts/1", payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it("404 for a non-existent post even with valid markup", async () => {
    const res = await inject({ method: "PUT", url: "/api/posts/999999", payload: { markup } });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/posts/:id", () => {
  it("404 for non-existent post", async () => {
    const res = await inject({ method: "DELETE", url: "/api/posts/999999" });
    expect(res.statusCode).toBe(404);
  });
});

describe("post theme validation", () => {
  const markup = "<body>\n  <Slide />\n</body>\n";

  it("400 rather than storing a theme loadTheme would later throw on", async () => {
    const res = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup, theme: "no-such-theme" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/theme/i);
  });

  it('treats a blank theme as "use the default" rather than rejecting it', async () => {
    const res = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup, theme: "" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().theme).toBe("warm-industrial-1");
    await inject({ method: "DELETE", url: `/api/posts/${res.json().id}` });
  });

  it("400 on an update to an unknown theme, leaving the stored one alone", async () => {
    const created = await inject({ method: "POST", url: "/api/posts", payload: { markup } });
    const { id, theme } = created.json();
    const res = await inject({
      method: "PUT",
      url: `/api/posts/${id}`,
      payload: { markup, theme: "no-such-theme" },
    });
    expect(res.statusCode).toBe(400);
    const after = await inject({ method: "GET", url: `/api/posts/${id}` });
    expect(after.json().theme).toBe(theme);
    await inject({ method: "DELETE", url: `/api/posts/${id}` });
  });
});

describe("PUT /api/posts/:id/status", () => {
  it("moves a post between draft and published", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup: "<body>\n  <Slide />\n</body>\n" },
    });
    const { id } = created.json();
    expect(created.json().status).toBe("draft");

    const published = await inject({
      method: "PUT",
      url: `/api/posts/${id}/status`,
      payload: { status: "published" },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().status).toBe("published");

    const bad = await inject({
      method: "PUT",
      url: `/api/posts/${id}/status`,
      payload: { status: "rendered" },
    });
    expect(bad.statusCode).toBe(400);

    await inject({ method: "DELETE", url: `/api/posts/${id}` });
  });

  it("404 for a non-existent post", async () => {
    const res = await inject({
      method: "PUT",
      url: "/api/posts/999999/status",
      payload: { status: "published" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// =========================================================================
// Publish
// =========================================================================
describe("POST /api/posts/:id/publish", () => {
  it("404 for a non-existent post", async () => {
    const res = await inject({ method: "POST", url: "/api/posts/999999/publish" });
    expect(res.statusCode).toBe(404);
  });

  it("409 for a post that has not been rendered", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup: "<body>\n  <Slide />\n</body>\n" },
    });
    const { id } = created.json();
    const res = await inject({ method: "POST", url: `/api/posts/${id}/publish` });
    expect(res.statusCode).toBe(409);
    await inject({ method: "DELETE", url: `/api/posts/${id}` });
  });

  // The render's folder was cleaned up before publishing. This
  // used to be a 409 carrying ENOENT's absolute path.
  it("404 with no path when the render output directory is gone", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup: "<body>\n  <Slide />\n</body>\n" },
    });
    const { id } = created.json();
    const gone = join(tmpdir(), "newspapper-output-that-does-not-exist", "2026-10-02-1");
    recordRender(appDb(), { postId: id, outputDir: gone, slideCount: 1 });
    const res = await inject({ method: "POST", url: `/api/posts/${id}/publish` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "Output directory no longer exists" });
    expect(res.body).not.toContain(tmpdir());
    await inject({ method: "DELETE", url: `/api/posts/${id}` });
  });
});

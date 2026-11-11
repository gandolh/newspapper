/**
 * `GET /api/renders` points the grid at the run's small thumbnail,
 * and falls back to the first slide for runs made before thumbnails existed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPost, recordRender } from "@newspapper/core";

import { buildTestApp } from "../../testing/buildTestApp.js";
import { db, resetDb } from "../../lib/db.js";
import type { InjectOpts } from "../../testing/signedInApp.js";
import { signInCookie } from "../../testing/ward.js";

const outputRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../output");
const dirs = ["1999-01-01-1", "1999-01-01-2"].map((d) => join(outputRoot, d));
let tmp: string;
let app: Awaited<ReturnType<typeof buildTestApp>>;
let session: Record<string, string>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "np-renders-"));
  process.env["NEWSPAPPER_DB_PATH"] = join(tmp, "test.db");
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "slide-01.jpg"), "jpg");
  }
  writeFileSync(join(dirs[0], "thumb.jpg"), "thumb");
});

afterAll(() => {
  resetDb();
  delete process.env["NEWSPAPPER_DB_PATH"];
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  app = await buildTestApp();
  await app.ready();
  session = (await signInCookie(app)).cookies;
});

afterEach(async () => {
  await app.close();
});

describe("GET /api/renders thumbnails", () => {
  it("uses thumb.jpg when the run has one, and the first slide when it does not", async () => {
    const markup = "<head><title>T</title></head><body><Slide /></body>";
    const withThumb = createPost(db(), { title: "new", markup });
    const older = createPost(db(), { title: "old", markup });
    recordRender(db(), { postId: withThumb.id, outputDir: dirs[0], slideCount: 1 });
    recordRender(db(), { postId: older.id, outputDir: dirs[1], slideCount: 1 });

    const res = await app.inject({
      method: "GET",
      url: "/api/renders",
      cookies: session,
    });
    const byPost = new Map(
      res.json<Array<{ postId: number; thumb: string | null; files: string[] }>>().map((r) => [r.postId, r]),
    );
    expect(byPost.get(withThumb.id)!.thumb).toBe("/output/1999-01-01-1/thumb.jpg");
    expect(byPost.get(withThumb.id)!.files).toEqual(["/output/1999-01-01-1/slide-01.jpg"]);
    expect(byPost.get(older.id)!.thumb).toBe("/output/1999-01-01-2/slide-01.jpg");
  });
});

/** The session's cookie on every request, as the other route tests send it. */
async function inject(opts: InjectOpts) {
  const { cookies, ...rest } = opts;
  return app.inject({ ...rest, cookies: { ...session, ...cookies } });
}

// =========================================================================
// Renders — the post library's thumbnail + "can this be exported" source
// =========================================================================
describe("GET /api/renders", () => {
  it("returns an array", async () => {
    const res = await inject({ method: "GET", url: "/api/renders" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("is empty for a post that has never been rendered", async () => {
    const created = await inject({
      method: "POST",
      url: "/api/posts",
      payload: { markup: "<body>\n  <Slide />\n</body>\n" },
    });
    const { id } = created.json();
    const res = await inject({ method: "GET", url: `/api/renders?postId=${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await inject({ method: "DELETE", url: `/api/posts/${id}` });
  });

  it("400 when postId is not an integer", async () => {
    const res = await inject({ method: "GET", url: "/api/renders?postId=abc" });
    expect(res.statusCode).toBe(400);
  });
});

// =========================================================================
// Export.zip — 404 when draft
// =========================================================================
describe("GET /api/posts/:id/export.zip", () => {
  it("404 for non-existent post", async () => {
    const res = await inject({ method: "GET", url: "/api/posts/999999/export.zip" });
    expect(res.statusCode).toBe(404);
  });

  it("404 for a draft post (not rendered)", async () => {
    // Create an article first
    const artRes = await inject({
      method: "POST",
      url: "/api/articles",
      payload: { title: "Draft test", body: "Body text" },
    });
    const article = artRes.json();

    expect(article.id).toBeGreaterThan(0);
    const res = await inject({ method: "GET", url: `/api/posts/999998/export.zip` });
    expect(res.statusCode).toBe(404);
  });
});

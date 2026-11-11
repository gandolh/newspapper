/**
 * The app as a whole, through fastify.inject(): the one error handler. The routes' own tests are
 * beside each feature, in features/<name>/.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { buildTestApp } from "./testing/buildTestApp.js";
import { db as appDb, resetDb } from "./lib/db.js";
import { signInCookie } from "./testing/ward.js";

// Use an isolated temp DB for tests to avoid collisions with dev data.
let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "newspapper-test-"));
  process.env["NEWSPAPPER_DB_PATH"] = join(tmpDir, "test.db");
});

afterAll(() => {
  resetDb();
  delete process.env["NEWSPAPPER_DB_PATH"];
  rmSync(tmpDir, { recursive: true, force: true });
});

// =========================================================================
// Error bodies: a 5xx never echoes the exception's own text
// =========================================================================

describe("the global error handler", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    app = await buildTestApp();
    // Routes outside the guarded prefixes, so no session is needed to reach them.
    app.get("/__test/boom", async () => {
      throw new Error("secret internal detail: /srv/newspapper/data/newspapper.db");
    });
    app.get("/__test/bad-request", async () => {
      throw Object.assign(new Error("title is required"), { statusCode: 400 });
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("answers an unexpected throw with a generic 500 body", async () => {
    const res = await app.inject({ method: "GET", url: "/__test/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("secret internal detail");
    expect(res.body).not.toContain("/srv/");
    expect(res.json()).toEqual({ error: "Internal Server Error" });
  });

  it("keeps a deliberate 4xx message", async () => {
    const res = await app.inject({ method: "GET", url: "/__test/bad-request" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "title is required" });
  });

  // The routes are plugins registered inside buildApp. Until 2026-11-11 the handler was set after
  // them, so they kept Fastify's default handler, which sends a 500's message.
  it("keeps a real route's 500 detail out of the body too", async () => {
    const session = (await signInCookie(app)).cookies;
    appDb().exec("ALTER TABLE articles RENAME TO articles_gone");
    try {
      const res = await app.inject({ method: "GET", url: "/api/articles", cookies: session });
      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({ error: "Internal Server Error" });
      expect(res.body).not.toContain("articles");
    } finally {
      appDb().exec("ALTER TABLE articles_gone RENAME TO articles");
    }
  });

  it("answers Fastify's own 400 for a body that is not JSON in the same body", async () => {
    const session = (await signInCookie(app)).cookies;
    const res = await app.inject({
      method: "POST",
      url: "/api/articles",
      cookies: session,
      headers: { "content-type": "application/json" },
      payload: "{",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Body is not valid JSON but content-type is set to 'application/json'" });
  });
});

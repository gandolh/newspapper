import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { resetDb } from "../lib/db.js";
import { buildTestApp } from "./buildTestApp.js";
import { signInCookie } from "./ward.js";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface InjectOpts {
  method: Method;
  url: string;
  payload?: string | object;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * For a test file of route tests: a scratch database for the whole file, and before each test a fresh
 * app with a signed-in session, closed after it. Every `/api/*` route is behind the session guard, so
 * each test mints a real local session on the app's own accounts and replays its cookie: the **real**
 * guard still runs, and nothing about it is stubbed. Call it once, at the top of the file.
 *
 *     const { inject } = useSignedInApp();
 *     it("lists the posts", async () => {
 *       expect((await inject({ method: "GET", url: "/api/posts" })).statusCode).toBe(200);
 *     });
 */
export function useSignedInApp() {
  let tmpDir = "";
  let app: Awaited<ReturnType<typeof buildTestApp>> | undefined;
  let session: Record<string, string> = {};

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "newspapper-test-"));
    process.env["NEWSPAPPER_DB_PATH"] = join(tmpDir, "test.db");
  });

  afterAll(() => {
    resetDb();
    delete process.env["NEWSPAPPER_DB_PATH"];
    rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    app = await buildTestApp();
    await app.ready();
    session = (await signInCookie(app)).cookies;
  });

  afterEach(async () => {
    await app?.close();
  });

  return {
    async inject(opts: InjectOpts) {
      if (app === undefined) throw new Error("useSignedInApp: inject outside a test");
      const { cookies, ...rest } = opts;
      return app.inject({ ...rest, cookies: { ...session, ...cookies } });
    },
  };
}

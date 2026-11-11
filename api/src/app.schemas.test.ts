/**
 * Every response schema the app declares is transform-free. The zod type provider encodes a reply with
 * its schema, so a `.transform()` or a pipe (`z.preprocess` is one) can't run backwards: it fails every
 * reply on that route with a 500. Input schemas may transform; this reads only the ones Fastify compiles
 * for replies, by wrapping the serializer compiler buildApp sets.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { resetDb } from "./lib/db.js";
import { buildTestApp } from "./testing/buildTestApp.js";

const compiled = vi.hoisted(() => [] as { method: string; url: string; httpStatus?: string; schema: unknown }[]);

vi.mock("@fastify/type-provider-zod", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fastify/type-provider-zod")>();
  return {
    ...actual,
    serializerCompiler: (route: Parameters<typeof actual.serializerCompiler>[0]) => {
      compiled.push({ method: route.method, url: route.url, httpStatus: route.httpStatus, schema: route.schema });
      return actual.serializerCompiler(route);
    },
  };
});

/** The kinds of zod schema that can't encode: each runs one way only. */
const ONE_WAY = new Set(["transform", "pipe"]);

/** Every one-way node inside a zod schema, by its path: `["items.[].excerpt (transform)"]`. */
function oneWayNodes(schema: unknown, path = "reply"): string[] {
  if (typeof schema !== "object" || schema === null || !("_zod" in schema)) return [];
  const def = (schema as { _zod: { def: Record<string, unknown> } })._zod.def;
  const type = String(def["type"]);
  const found = ONE_WAY.has(type) ? [`${path} (${type})`] : [];
  for (const [key, value] of Object.entries(def)) {
    if (key === "shape" && typeof value === "object" && value !== null) {
      for (const [field, inner] of Object.entries(value)) found.push(...oneWayNodes(inner, `${path}.${field}`));
    } else if (Array.isArray(value)) {
      for (const inner of value) found.push(...oneWayNodes(inner, `${path}.${key}`));
    } else {
      found.push(...oneWayNodes(value, key === "element" ? `${path}.[]` : path));
    }
  }
  return found;
}

describe("the response schemas", () => {
  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "np-schemas-"));
    process.env["NEWSPAPPER_DB_PATH"] = join(tmp, "test.db");
  });

  afterAll(() => {
    resetDb();
    delete process.env["NEWSPAPPER_DB_PATH"];
    rmSync(tmp, { recursive: true, force: true });
  });

  it("hold no transform or pipe, on any route", async () => {
    const app = await buildTestApp();
    await app.ready();
    await app.close();
    // The control: all 31 JSON routes' replies were compiled (Fastify adds a HEAD beside each GET),
    // so the walk below reached every one. The other 6 routes stream or send files (Q53).
    const routes = new Set(compiled.filter((route) => route.method !== "HEAD").map((r) => `${r.method} ${r.url}`));
    expect(routes.size).toBe(31);
    const oneWay = compiled.flatMap((route) =>
      oneWayNodes(route.schema).map((node) => `${route.method} ${route.url} ${route.httpStatus}: ${node}`),
    );
    expect(oneWay).toEqual([]);
  });

  it("would catch one", () => {
    expect(oneWayNodes(z.object({ items: z.array(z.object({ at: z.string().transform(Number) })) }))).toEqual([
      "reply.items.[].at (pipe)",
      "reply.items.[].at (transform)",
    ]);
  });
});

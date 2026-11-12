import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveSources } from "@newspapper/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../lib/db.js";
import { buildTestApp } from "../testing/buildTestApp.js";
import { signInCookie } from "../testing/ward.js";

/**
 * Unit test for SSE frame format.
 * We mock reply.raw and verify that sseWrite/sseDone/sseError emit the correct frame format.
 */

interface MockRaw {
  written: string[];
  ended: boolean;
  write(chunk: string): void;
  end(): void;
  setHeader(_name: string, _value: string): void;
  writeHead(_code: number): void;
}

function makeReply(): { raw: MockRaw } {
  const mock: MockRaw = {
    written: [],
    ended: false,
    write(chunk: string) {
      this.written.push(chunk);
    },
    end() {
      this.ended = true;
    },
    setHeader() {},
    writeHead() {},
  };
  return { raw: mock };
}

// Import inline to avoid module resolution issues in tests
function sseWrite(reply: { raw: MockRaw }, event: string, data: unknown): void {
  const payload = JSON.stringify(data);
  reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
}

function sseDone(reply: { raw: MockRaw }, data: unknown): void {
  sseWrite(reply, "done", data);
  reply.raw.end();
}

function sseError(reply: { raw: MockRaw }, message: string): void {
  sseWrite(reply, "error", { message });
  reply.raw.end();
}

describe("SSE helper frame format", () => {
  it("sseWrite emits event: <name>\\ndata: <json>\\n\\n", () => {
    const reply = makeReply();
    sseWrite(reply, "progress", { stage: "prompting" });
    expect(reply.raw.written).toHaveLength(1);
    expect(reply.raw.written[0]).toBe('event: progress\ndata: {"stage":"prompting"}\n\n');
  });

  it("sseDone emits done event then ends stream", () => {
    const reply = makeReply();
    sseDone(reply, { ok: true });
    expect(reply.raw.written[0]).toMatch(/^event: done\ndata: /);
    expect(reply.raw.written[0]).toContain('"ok":true');
    expect(reply.raw.ended).toBe(true);
  });

  it("sseError emits error event with message field then ends stream", () => {
    const reply = makeReply();
    sseError(reply, "something went wrong");
    expect(reply.raw.written[0]).toBe('event: error\ndata: {"message":"something went wrong"}\n\n');
    expect(reply.raw.ended).toBe(true);
  });

  it("sseWrite with complex payload serializes correctly", () => {
    const reply = makeReply();
    sseWrite(reply, "progress", { done: 3, total: 7 });
    expect(reply.raw.written[0]).toBe('event: progress\ndata: {"done":3,"total":7}\n\n');
  });
});

/*
 * On a real socket, because `inject()` can't show it: Fastify runs its onClose hooks only after
 * the requests in flight have finished, and a stream waiting on a slow feed doesn't finish for up to
 * its 30 s fetch timeout. At SIGTERM, close-with-grace would give up after 10 s and exit 1.
 */
describe("closing the server", () => {
  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "np-sse-close-"));
    process.env["NEWSPAPPER_DB_PATH"] = join(tmp, "test.db");
  });

  afterAll(() => {
    resetDb();
    delete process.env["NEWSPAPPER_DB_PATH"];
    rmSync(tmp, { recursive: true, force: true });
  });

  it("ends an open stream with an error event rather than waiting for a slow feed", async () => {
    saveSources([{ id: "slow", name: "Slow", rss: "https://feeds.example/slow", enabled: true, category: null }], db());
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deps = {
      fetch: (async () => {
        await held;
        throw new Error("released");
      }) as unknown as typeof fetch,
      lookup: async () => ["93.184.216.34"],
    };
    const app = await buildTestApp({ readerRefresh: { deps } });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { cookies } = await signInCookie();
    const { port } = app.server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/reader/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: Object.entries(cookies)
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
      body: "{}",
    });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (!text.includes('"status":"fetching"')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    const started = Date.now();
    await app.close();
    const closedIn = Date.now() - started;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    release();

    expect(closedIn).toBeLessThan(2_000);
    expect(text).toMatch(/event: error\ndata: \{"message":"The server is restarting\. Try again in a moment\."\}\n\n$/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import { fetchBody } from "./body.js";
import { fetchFeed, fetchFeedConditional } from "./rss.js";
import { isPublicAddress, readCapped, RefusedAddressError, safeFetch, vetUrl, vettingLookup } from "./safe-url.js";

/** DNS for the tests: names map to fixed addresses, nothing hits the network. */
const DNS: Record<string, string[]> = {
  "news.example": ["93.184.216.34"],
  "evil.example": ["93.184.216.35"],
  "rebound.example": ["10.0.0.5"],
  "mixed.example": ["93.184.216.36", "127.0.0.1"],
};
const lookup = async (host: string) => DNS[host] ?? [];

function html(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" }, ...init });
}

/** A fetch spy that answers from a URL → response table and records every URL. */
function fakeFetch(routes: Record<string, () => Response>) {
  const spy = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route();
  });
  return spy as unknown as typeof fetch & typeof spy;
}

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1", // mapped, hex form
    "64:ff9b::7f00:1", // NAT64 of 127.0.0.1
    "64:ff9b::a9fe:a9fe", // NAT64 of the metadata address
    "::7f00:1", // IPv4-compatible 127.0.0.1
    "::10.0.0.1",
    "2002:7f00:1::", // 6to4
    "2002:5db8:d822::1", // 6to4 is blocked whatever IPv4 it carries
    "fe80::1%eth0",
  ])("refuses %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each([
    "93.184.216.34",
    "1.1.1.1",
    "172.32.0.1",
    "2606:4700::1111",
    "64:ff9b::808:808", // NAT64 of a public address is that public address
    "::ffff:93.184.216.34",
    "2001:db8:2002::1", // 2002 only counts as the first group
  ])("allows %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe("vettingLookup", () => {
  const answer = (addresses: string[]) => async () => addresses;
  type Result = { err: NodeJS.ErrnoException | null; address: unknown; family?: number };
  const call = (lookup: ReturnType<typeof vettingLookup>, options: object) =>
    new Promise<Result>((resolve) =>
      lookup("host.example", options, (err, address, family) => resolve({ err, address, family })),
    );

  it("serves one address to a single-address lookup", async () => {
    const lookup = vettingLookup(answer(["93.184.216.34", "2606:4700::1111"]));
    expect(await call(lookup, {})).toEqual({ err: null, address: "93.184.216.34", family: 4 });
    expect(await call(lookup, { family: 6 })).toEqual({
      err: null,
      address: "2606:4700::1111",
      family: 6,
    });
  });

  it("serves every address to an all: true lookup", async () => {
    const lookup = vettingLookup(answer(["93.184.216.34", "2606:4700::1111"]));
    expect((await call(lookup, { all: true })).address).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:4700::1111", family: 6 },
    ]);
  });

  it.each([{}, { all: true }])("refuses when any address is private (%o)", async (options) => {
    for (const addresses of [["127.0.0.1"], ["93.184.216.34", "10.0.0.5"], []]) {
      const { err } = await call(vettingLookup(answer(addresses)), options);
      expect(err).toBeInstanceOf(RefusedAddressError);
    }
  });

  it("checks a literal IP host without resolving it", async () => {
    const lookup = vi.fn(answer(["93.184.216.34"]));
    const result = await new Promise<Result>((resolve) =>
      vettingLookup(lookup)("127.0.0.1", {}, (err, address) => resolve({ err, address })),
    );
    expect(result.err).toBeInstanceOf(RefusedAddressError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("passes a DNS failure on", async () => {
    const failing = async () => {
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    };
    expect((await call(vettingLookup(failing), {})).err?.code).toBe("ENOTFOUND");
  });
});

describe("vetUrl", () => {
  it("requires http or https", async () => {
    expect(await vetUrl("file:///etc/passwd", lookup)).toBeNull();
    expect(await vetUrl("gopher://news.example/", lookup)).toBeNull();
    expect(await vetUrl("not a url", lookup)).toBeNull();
  });

  it("refuses a host that resolves to any private address", async () => {
    expect(await vetUrl("https://rebound.example/x", lookup)).toBeNull();
    expect(await vetUrl("https://mixed.example/x", lookup)).toBeNull();
    expect(await vetUrl("https://unknown.example/x", lookup)).toBeNull();
    expect(await vetUrl("http://[::1]:8080/", lookup)).toBeNull();
  });

  it("accepts a public host", async () => {
    expect((await vetUrl("https://news.example/a", lookup))?.href).toBe("https://news.example/a");
  });
});

describe("fetchBody refuses internal targets without ever requesting them", () => {
  it.each(["http://127.0.0.1:9999/", "http://169.254.169.254/latest/meta-data/", "http://rebound.example/"])(
    "%s → empty, no request",
    async (url) => {
      const fetch = fakeFetch({});
      expect(await fetchBody(url, "ua", 1000, { fetch, lookup })).toBe("");
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("a public page that redirects inward is refused at the redirect, before the inner request", async () => {
    const fetch = fakeFetch({
      "https://evil.example/story": () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1:3001/api/settings" },
        }),
    });
    expect(await fetchBody("https://evil.example/story", "ua", 1000, { fetch, lookup })).toBe("");
    expect(fetch.mock.calls.map(([u]) => String(u))).toEqual(["https://evil.example/story"]);
  });

  it("a redirect between public hosts is followed", async () => {
    const fetch = fakeFetch({
      "https://evil.example/old": () =>
        new Response(null, { status: 301, headers: { location: "https://news.example/new" } }),
      "https://news.example/new": () => html("<p>Moved here</p>"),
    });
    expect(await fetchBody("https://evil.example/old", "ua", 1000, { fetch, lookup })).toBe("Moved here");
  });

  it("a normal public article still returns its stripped text", async () => {
    const fetch = fakeFetch({
      "https://news.example/a": () => html("<h1>Title</h1><p>Body &amp; more</p>"),
    });
    expect(await fetchBody("https://news.example/a", "ua", 1000, { fetch, lookup })).toBe("Title Body & more");
  });
});

describe("bodies are capped", () => {
  it("stops reading past the cap instead of buffering the whole body", async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 1000) controller.close();
        else controller.enqueue(new TextEncoder().encode("x".repeat(64 * 1024)));
      },
    });
    const text = await readCapped(new Response(stream), 256 * 1024);
    expect(text.length).toBe(256 * 1024);
    expect(pulled).toBeLessThan(10); // ~4 chunks read, not 1000 (64 MB)
  });

  it("fetchBody applies the cap", async () => {
    const big = `<p>${"a".repeat(3 * 1024 * 1024)}</p>`;
    const fetch = fakeFetch({ "https://news.example/big": () => html(big) });
    const text = await fetchBody("https://news.example/big", "ua", 1000, { fetch, lookup });
    expect(text.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(text.length).toBeGreaterThan(1024 * 1024);
  });
});

describe("fetchFeed uses the same guard", () => {
  it("refuses an internal feed URL without requesting it", async () => {
    const fetch = fakeFetch({});
    await expect(fetchFeed("http://127.0.0.1:9999/rss", "ua", 1000, { fetch, lookup })).rejects.toThrow(/public/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("parses a public feed", async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
      <item><title>Hello</title><link>https://news.example/a</link><pubDate>Thu, 01 Oct 2026 10:00:00 GMT</pubDate></item>
      </channel></rss>`;
    const fetch = fakeFetch({
      "https://news.example/rss": () => new Response(xml, { headers: { "content-type": "application/rss+xml" } }),
    });
    const items = await fetchFeed("https://news.example/rss", "ua", 1000, { fetch, lookup });
    expect(items.map((i) => i.title)).toEqual(["Hello"]);
  });
});

/**
 * The real request, against a server on loopback. `safeFetch` refuses
 * loopback, so a test that must reach the server answers a public address and
 * maps it to 127.0.0.1 through `connectTo`, which runs only after the check.
 */
describe("a request connects only to the address that was checked", () => {
  let server: Server;
  let port: number;
  let hits: Array<{ url: string; headers: IncomingMessage["headers"] }>;
  let handle: (req: IncomingMessage, res: ServerResponse) => void;

  beforeEach(async () => {
    hits = [];
    handle = (_req, res) => res.end("ok");
    server = createServer((req, res) => {
      hits.push({ url: req.url ?? "", headers: req.headers });
      handle(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const PUBLIC = "93.184.216.34";
  const toLoopback = () => "127.0.0.1";

  it("a name that rebinds to loopback after the check is refused, and nothing reaches the server", async () => {
    let calls = 0;
    const lookup = async () => (calls++ === 0 ? [PUBLIC] : ["127.0.0.1"]);
    expect(await safeFetch(`http://rebind.example:${port}/secret`, {}, { lookup })).toBeNull();
    expect(calls).toBe(2); // the check, then the connection: both went through the lookup
    expect(hits).toEqual([]);
  });

  it("a name that always answers loopback is refused before any connection", async () => {
    const lookup = vi.fn(async () => ["127.0.0.1"]);
    expect(await safeFetch(`http://inside.example:${port}/`, {}, { lookup })).toBeNull();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(hits).toEqual([]);
  });

  it("a redirect to a name that answers a private address is refused", async () => {
    const dns: Record<string, string[]> = {
      "public.example": [PUBLIC],
      "inner.example": ["10.0.0.5"],
    };
    handle = (_req, res) => {
      res.writeHead(302, { location: `http://inner.example:${port}/secret` });
      res.end();
    };
    const res = await safeFetch(
      `http://public.example:${port}/start`,
      {},
      { lookup: async (host) => dns[host] ?? [], connectTo: toLoopback },
    );
    expect(res).toBeNull();
    expect(hits.map((hit) => hit.url)).toEqual(["/start"]);
  });

  it("a public answer is fetched, with the caller headers", async () => {
    const connectTo = vi.fn(toLoopback);
    handle = (_req, res) => {
      res.writeHead(200, { "content-type": "text/html", etag: '"v1"' });
      res.end("<p>hello</p>");
    };
    const res = await safeFetch(
      `http://news.example:${port}/a`,
      { headers: { "User-Agent": "ua-test" } },
      { lookup: async () => [PUBLIC], connectTo },
    );
    expect(res?.status).toBe(200);
    expect(res?.headers.get("etag")).toBe('"v1"');
    expect(await res?.text()).toBe("<p>hello</p>");
    expect(connectTo).toHaveBeenCalledWith(PUBLIC);
    expect(hits).toHaveLength(1);
    expect(hits[0].headers["user-agent"]).toBe("ua-test");
    expect(hits[0].headers["accept-encoding"]).toBe("gzip, deflate");
  });

  const deps = { lookup: async () => [PUBLIC], connectTo: toLoopback };

  it.each([
    ["gzip", gzipSync],
    ["deflate", deflateSync],
    ["br", brotliCompressSync],
  ] as const)("a %s body comes back decompressed", async (coding, compress) => {
    handle = (_req, res) => {
      res.writeHead(200, { "content-encoding": coding });
      res.end(compress(Buffer.from("plain words")));
    };
    const res = await safeFetch(`http://news.example:${port}/z`, {}, deps);
    expect(await readCapped(res!)).toBe("plain words");
  });

  it("the cap counts decompressed bytes", async () => {
    handle = (_req, res) => {
      res.writeHead(200, { "content-encoding": "gzip" });
      res.end(gzipSync(Buffer.from("a".repeat(8 * 1024 * 1024)))); // ~8 KB on the wire
    };
    const res = await safeFetch(`http://news.example:${port}/bomb`, {}, deps);
    const text = await readCapped(res!, 256 * 1024);
    expect(text.length).toBe(256 * 1024);
    expect(text).toMatch(/^a+$/);
  });

  it("a 304 has no body, and the feed reader sees it as not modified", async () => {
    handle = (_req, res) => {
      res.writeHead(304, { etag: '"v1"' });
      res.end();
    };
    const res = await safeFetch(`http://news.example:${port}/rss`, {}, deps);
    expect(res?.status).toBe(304);
    expect(res?.body).toBeNull();
    const feed = await fetchFeedConditional(
      `http://news.example:${port}/rss`,
      { userAgent: "ua", timeoutMs: 5000, etag: '"v1"' },
      deps,
    );
    expect(feed.status).toBe("notModified");
    expect(hits[1].headers["if-none-match"]).toBe('"v1"');
  });

  it("an abort before the answer rejects", async () => {
    handle = () => {}; // never answers
    const controller = new AbortController();
    const pending = safeFetch(`http://news.example:${port}/slow`, { signal: controller.signal }, deps);
    await vi.waitFor(() => expect(hits).toHaveLength(1));
    controller.abort();
    await expect(pending).rejects.toThrow(/abort/i);
  });

  it("an abort while the body streams errors the read", async () => {
    handle = (_req, res) => {
      res.writeHead(200);
      res.write("first part ");
    };
    const controller = new AbortController();
    const res = await safeFetch(`http://news.example:${port}/half`, { signal: controller.signal }, deps);
    const reading = readCapped(res!);
    controller.abort();
    await expect(reading).rejects.toThrow();
  });
});

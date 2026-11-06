import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { pipeline, Readable } from 'node:stream';
import zlib from 'node:zlib';

/**
 * Server-side fetches of URLs that a third party chose: feed URLs, and the
 * `<link>` of every item a feed returns.
 *
 * newspapper runs on a shared VPS now, not on loopback, so a fetch the server
 * makes on a feed's say-so is a fetch from *inside* that box. Without this, a
 * hostile item linking to `http://127.0.0.1:<sibling-port>/` or the metadata
 * address, or to a public page that 302s there, was fetched, and an HTML answer
 * was stored and shown as the article body. A multi-gigabyte body was buffered
 * whole, in parallel across items.
 *
 * So: http(s) only; the host must resolve to public addresses only; redirects
 * are followed by hand with the same check at every hop; and bodies are read
 * through a byte cap.
 *
 * The socket connects only to an address that was checked. `fetch` resolved
 * the name a second time when it connected, so whoever runs a feed's DNS could
 * answer a public address to the check and a private one to the connection (DNS
 * rebinding, with a short TTL). The requests therefore go through `node:http`
 * and `node:https`, whose `lookup` option replaces the connection's own name
 * resolution: `vettingLookup` resolves the host, refuses unless every address
 * is public, and hands the socket only those addresses. TLS still checks the
 * certificate against the host name. A literal IP host never reaches `lookup`,
 * since there is nothing to resolve and so nothing to rebind; `vetUrl` has
 * judged it already. Kept-alive sockets live in this module's own agents, so a
 * reused socket was opened through the same check.
 */

/** Addresses the server must never fetch on a feed's behalf. */
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, incl. cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. broadcast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128],
  ['2002::', 16], // 6to4: the relay it routes through is anyone's
  ['fc00::', 7], // unique-local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv6');
}

/** An IPv6 address (already known to be one) as its eight 16-bit groups. */
function ipv6Groups(address: string): number[] {
  let text = address;
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(1).map(Number) as [number, number, number, number];
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split('::') as [string, string | undefined];
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const zeros = tail === undefined ? [] : Array(8 - left.length - right.length).fill('0');
  return [...left, ...zeros, ...right].map((group) => parseInt(group, 16));
}

/**
 * The IPv4 address an IPv6 address carries in its last 32 bits, for the three
 * forms that reach it: IPv4-mapped (`::ffff:0:0/96`), NAT64 (`64:ff9b::/96`)
 * and the deprecated IPv4-compatible form (`::/96`, which also covers `::` and
 * `::1`). `null` for any other address.
 */
function embeddedIPv4(address: string): string | null {
  const g = ipv6Groups(address);
  const zero = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  const mapped = zero(0, 5) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && zero(2, 6);
  if (!mapped && !nat64 && !zero(0, 6)) return null;
  const [hi, lo] = [g[6]!, g[7]!];
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

/** True for an address the server may fetch. An IPv6 address that carries an
 * IPv4 one (mapped, NAT64, IPv4-compatible) is judged as that IPv4 address, so
 * `::ffff:127.0.0.1` and `64:ff9b::7f00:1` are blocked too; 6to4 is blocked
 * outright. */
export function isPublicAddress(address: string): boolean {
  const bare = address.replace(/%.*$/, ''); // an IPv6 zone id
  const family = isIP(bare);
  if (family === 4) return !BLOCKED.check(bare, 'ipv4');
  if (family !== 6) return false;
  const v4 = embeddedIPv4(bare);
  if (v4 !== null) return isPublicAddress(v4);
  return !BLOCKED.check(bare, 'ipv6');
}

export type Lookup = (host: string) => Promise<string[]>;

const systemLookup: Lookup = async (host) =>
  (await dnsLookup(host, { all: true, verbatim: true })).map((entry) => entry.address);

/** The connect-time refusal: a host resolved to an address that is not public. */
export class RefusedAddressError extends Error {
  constructor(host: string) {
    super(`${host} does not resolve to public addresses only`);
    this.name = 'RefusedAddressError';
  }
}

export interface SafeFetchDeps {
  /** Replaces the real request. Tests only: every hop is still vetted. */
  fetch?: typeof fetch;
  /** Replaces DNS, for the early check and for the connection alike. */
  lookup?: Lookup;
  /**
   * Tests only: where the socket goes for an address that passed the check,
   * so a test can point a public answer at a loopback server. It runs after
   * the check, which still judges exactly what the lookup answered.
   */
  connectTo?: (address: string) => string;
}

/**
 * A `lookup` for `net.connect` (and so for `http.request`) that resolves the
 * host through `lookup`, refuses with a `RefusedAddressError` unless every
 * address is public, and hands the socket only those addresses. Both callback
 * shapes are served: one address, and `all: true`, which Node uses when it
 * tries IPv4 and IPv6 addresses in turn.
 */
export function vettingLookup(
  lookup: Lookup = systemLookup,
  connectTo: (address: string) => string = (address) => address,
): LookupFunction {
  return (hostname, options, callback) => {
    const host = hostname.replace(/^\[|\]$/g, '');
    const family = options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : options.family;
    (isIP(host) ? Promise.resolve([host]) : lookup(host)).then(
      (addresses) => {
        if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
          callback(new RefusedAddressError(host), '');
          return;
        }
        const entries = addresses
          .map((address) => connectTo(address))
          .map((address) => ({ address, family: isIP(address) }))
          .filter((entry) => !family || entry.family === family);
        if (entries.length === 0) {
          const err: NodeJS.ErrnoException = new Error(`${host} has no IPv${family} address`);
          err.code = 'ENOTFOUND';
          callback(err, '');
        } else if (options.all) {
          callback(null, entries);
        } else {
          callback(null, entries[0]!.address, entries[0]!.family);
        }
      },
      (err: NodeJS.ErrnoException) => callback(err, ''),
    );
  };
}

/** One pool per scheme, used by nothing else, so every kept-alive socket in it
 * was opened through `vettingLookup`. */
const AGENTS: Record<string, http.Agent> = {
  'http:': new http.Agent({ keepAlive: true }),
  'https:': new https.Agent({ keepAlive: true }),
};

/** Statuses whose response has no body: `new Response` refuses one. */
const NULL_BODY = new Set([204, 205, 304]);

/** Decoding stops at the end of what arrived instead of failing on a body
 * cut short, as `fetch` does. */
const ZLIB_LENIENT = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH,
};
const BROTLI_LENIENT = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH,
};

/**
 * The body with its `Content-Encoding` undone, as `fetch` did: gzip, deflate
 * (the zlib format HTTP specifies) and br, last applied first undone. An
 * unknown coding leaves the bytes as they came. The decoders keep the stream's
 * backpressure, so `readCapped`'s cap holds on the decompressed bytes and a
 * small compressed body cannot inflate past what is read.
 */
function decoded(res: http.IncomingMessage): Readable {
  const codings = (res.headers['content-encoding'] ?? '')
    .toLowerCase()
    .split(',')
    .map((coding) => coding.trim())
    .filter(Boolean)
    .reverse();
  const decoders: NodeJS.ReadWriteStream[] = [];
  for (const coding of codings) {
    if (coding === 'gzip' || coding === 'x-gzip') decoders.push(zlib.createGunzip(ZLIB_LENIENT));
    else if (coding === 'deflate') decoders.push(zlib.createInflate(ZLIB_LENIENT));
    else if (coding === 'br') decoders.push(zlib.createBrotliDecompress(BROTLI_LENIENT));
    else return res;
  }
  if (decoders.length === 0) return res;
  return pipeline([res, ...decoders], () => {}) as unknown as Readable;
}

/** The answer as a web `Response`: status, every header, and the body as a web
 * stream (none for a 204, 205 or 304). */
function toResponse(res: http.IncomingMessage): Response {
  const status = res.statusCode ?? 0;
  const headers = new Headers();
  for (let i = 0; i < res.rawHeaders.length; i += 2) {
    try {
      headers.append(res.rawHeaders[i]!, res.rawHeaders[i + 1]!);
    } catch {
      // A header value `Headers` won't hold; nothing here reads it.
    }
  }
  if (NULL_BODY.has(status)) {
    res.resume();
    return new Response(null, { status, headers });
  }
  const body = Readable.toWeb(decoded(res)) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, { status, headers });
}

/**
 * One request, no redirects followed, connecting through `lookup`. Resolves
 * once the status and headers arrive. Network errors, a refused address and
 * aborts reject, as `fetch` does; an abort after that errors the body.
 */
function request(url: URL, init: RequestInit, lookup: LookupFunction): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (init.body != null) throw new TypeError('safeFetch sends no request body');
    const headers = new Headers(init.headers);
    // What `fetch` sends; `decoded` undoes either.
    if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'gzip, deflate');
    const send = url.protocol === 'https:' ? https.request : http.request;
    const req = send(
      url,
      {
        method: init.method ?? 'GET',
        headers: Object.fromEntries(headers),
        agent: AGENTS[url.protocol],
        lookup,
        signal: init.signal ?? undefined,
      },
      (res) => {
        try {
          resolve(toResponse(res));
        } catch (err) {
          res.destroy();
          reject(err);
        }
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Parse and vet a URL: http(s), and every address its host resolves to is
 * public. Resolves to the URL, or `null` if it must not be fetched. Never
 * throws. */
export async function vetUrl(raw: string, lookup: Lookup = systemLookup): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = isIP(host) ? [host] : await lookup(host);
    if (addresses.length === 0 || !addresses.every(isPublicAddress)) return null;
  } catch {
    return null;
  }
  return url;
}

export const MAX_REDIRECTS = 5;

/**
 * A fetch to vetted URLs only, following redirects by hand so every hop is
 * vetted the same way, and connecting each hop only to an address that passed
 * the check (`vettingLookup`). Resolves to the final response, or `null` if any
 * hop was refused, at resolve time or at connect time, or there were too many.
 * Network errors and aborts reject, as `fetch` does.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit,
  deps: SafeFetchDeps = {},
): Promise<Response | null> {
  const lookup = vettingLookup(deps.lookup, deps.connectTo);
  const send = deps.fetch ?? ((url: URL, hop: RequestInit) => request(url, hop, lookup));
  let next = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await vetUrl(next, deps.lookup);
    if (!url) return null;
    let res: Response;
    try {
      res = await send(url, { ...init, redirect: 'manual' });
    } catch (err) {
      if (err instanceof RefusedAddressError) return null;
      throw err;
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      next = new URL(location, url).href;
      continue;
    }
    return res;
  }
  return null;
}

/** 2 MB: far more than any article page's text, far less than a hostile feed
 * would like the server to hold. */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Read a response body as text, stopping at `maxBytes`. Past the cap the rest
 * is cancelled, not downloaded, and the text read so far is returned: for an
 * article body a truncated page is still a page.
 */
export async function readCapped(
  res: Response,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const room = maxBytes - total;
      chunks.push(value.byteLength > room ? value.subarray(0, room) : value);
      total += Math.min(value.byteLength, room);
      if (total >= maxBytes) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

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
 * Known gap, stated rather than hidden: the address is checked at resolve time,
 * and the request resolves again when it connects. A DNS rebinding attacker who
 * controls a name's TTL could still swap in a private address between the two.
 * Closing that needs a connect-time check (a custom dispatcher), which is more
 * machinery than a single-editor tool's threat model warrants today.
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
  ['fc00::', 7], // unique-local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv6');
}

/** True for an address the server may fetch. IPv4-mapped IPv6 is judged as
 * the IPv4 address it carries, so `::ffff:127.0.0.1` is blocked too. */
export function isPublicAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return isPublicAddress(mapped[1]!);
  const family = isIP(address);
  if (family === 4) return !BLOCKED.check(address, 'ipv4');
  if (family === 6) return !BLOCKED.check(address, 'ipv6');
  return false;
}

export type Lookup = (host: string) => Promise<string[]>;

const systemLookup: Lookup = async (host) =>
  (await dnsLookup(host, { all: true, verbatim: true })).map((entry) => entry.address);

export interface SafeFetchDeps {
  fetch?: typeof fetch;
  lookup?: Lookup;
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
 * `fetch`, but only to vetted URLs, following redirects by hand so every hop is
 * vetted the same way. Resolves to the final response, or `null` if any hop was
 * refused or there were too many. Network errors and aborts reject, as `fetch`
 * does.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit,
  deps: SafeFetchDeps = {},
): Promise<Response | null> {
  const doFetch = deps.fetch ?? fetch;
  let next = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await vetUrl(next, deps.lookup);
    if (!url) return null;
    const res = await doFetch(url, { ...init, redirect: 'manual' });
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

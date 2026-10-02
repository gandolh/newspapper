# Task 85 — RSS body fetch follows attacker-controlled links with no host allowlist or size cap (SSRF)

## Context

Found in the 2026-09 security sweep. Feed content is untrusted — a feed item's
`<link>` is chosen by whoever controls the feed, and feeds can be added/edited
via `POST /api/sources`. `POST /api/scrape` fans out over items and, for each,
fetches the article body:

[core/src/scrape/body.ts:9-17](../../../core/src/scrape/body.ts):

```ts
const res = await fetch(url, {
  headers: { 'User-Agent': userAgent, Accept: 'text/html,…' },
  signal: controller.signal,
  redirect: 'follow',            // ← follows any redirect chain
});
if (!res.ok) return '';
const ct = res.headers.get('content-type') ?? '';
if (!ct.includes('html')) return '';
const html = await res.text();   // ← no size cap
```

- **SSRF.** `url` is `item.url` (`core/src/scrape/index.ts:108`), unvalidated. A
  hostile feed returns an item whose `<link>` is `http://127.0.0.1:<sibling-port>/…`
  or `http://169.254.169.254/…` (or a public URL that 302-redirects there —
  redirects are followed). When the editor runs a search, the server fetches it;
  if it returns HTML the stripped body is stored/shown as the article body,
  exfiltrating internal-only responses. Even non-HTML targets are a blind
  request/port-probe primitive against loopback and the docker network — exactly
  what the retired loopback posture used to preclude.
- **Unbounded read.** `await res.text()` has no cap and `fetchBody` runs in
  parallel across items (`Promise.all`, index.ts:106-111); a hostile feed serving
  multi-GB bodies can OOM the shared container.

## What to do

In `fetchBody` (and apply the same guard to any other server-side fetch of a
feed-derived URL — check `rss.ts`'s `parseURL`, whose `url` comes from
`POST /api/sources`):

1. Parse the URL; require `http:`/`https:`; reject anything else.
2. Resolve the host and reject private, loopback, link-local and unique-local
   ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`,
   `fc00::/7`, `fe80::/10`) and literal-IP metadata addresses. Re-validate on
   **every** redirect hop — set `redirect: 'manual'` and follow manually with the
   same check, or use a fetch that re-checks per hop — so a public host cannot
   302 you inward.
3. Cap the response body (e.g. stream and abort past ~2 MB); keep the existing
   per-request timeout.
4. Keep the existing "never throws → returns ''" contract: a rejected URL yields
   `''`, not an exception, so one bad item can't fail the whole search.

Sources are operator-added, but the app is single-editor and the feeds' *items*
are third-party — validate the item links regardless of trust in the feed host.

## Acceptance

- Tests (inject `fetch`, no real network): a `<link>` of `http://127.0.0.1:9999/`,
  `http://169.254.169.254/…`, and a public URL that redirects to `127.0.0.1` each
  yield `''` and make no request to the internal target (assert via the injected
  fetch spy that the internal host was never actually fetched).
- A body larger than the cap is truncated/aborted, not buffered whole.
- A normal public HTML article still returns its stripped text.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/scrape/body.ts` (+ `body.test.ts`)
- `core/src/scrape/rss.ts` (+ `rss` test) if the feed-URL fetch needs the same guard
- a small shared URL-guard helper if you extract one (e.g. `core/src/scrape/safe-url.ts`)

## Files you must NOT touch

- `core/src/scrape/index.ts`'s matching/ranking logic (the search semantics are a
  locked decision) — you may change only how a body is fetched
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-02

New `core/src/scrape/safe-url.ts`:
- `vetUrl` allows http(s) only, and the host must resolve to **only** public
  addresses. A `net.BlockList` covers 0/8, 10/8, 100.64/10, 127/8, 169.254/16,
  172.16/12, 192.0.0/24, 192.168/16, 198.18/15, multicast and reserved,
  `::`, `::1`, `fc00::/7`, `fe80::/10` and `ff00::/8`. IPv4-mapped IPv6 is
  judged as the IPv4 address it carries.
- `safeFetch` uses `redirect: 'manual'` and follows up to 5 hops by hand,
  vetting each one.
- `readCapped` is a streaming read that cancels at the cap.

`fetchBody` uses all three with a 2 MB body cap and keeps its never-throws,
`''`-on-refusal contract. `fetchFeed` (the `POST /api/sources` URL) now fetches
through `safeFetch` with a 10 MB cap and calls `parseString`, instead of
rss-parser's `parseURL`, which followed any redirect and read any size. It
still throws on failure, as before. Both take optional `{ fetch, lookup }`
dependencies for tests. `index.ts`'s matching and ranking are untouched.

Tests (`safe-url.test.ts`, injected fetch and DNS, no network):
- `fetchBody` refuses `http://127.0.0.1:9999/`, `http://169.254.169.254/…` and
  a name resolving to 10.0.0.5 with **zero** fetch calls.
- A public page that 302s to `127.0.0.1` is fetched once and the inner URL
  never is.
- A public-to-public redirect is followed, and a normal article still returns
  its text.
- `readCapped` read about 4 chunks of a 64 MB stream, not 1000.
- `fetchFeed` refuses an internal feed without fetching and parses a public one.

`npm test` 650/650 and `npm run build` (with `fmt:check`) are clean, and eslint
on the touched files is clean. Repo-wide `npm run lint` still has brief 80's
pre-existing error.

**Known residual, documented in the module:** the check runs at resolve time,
and the connection resolves again, so DNS rebinding with a short TTL could still
swap in a private address. Closing it needs a connect-time lookup in a custom
dispatcher. **Also:** a feed over 10 MB now fails to parse rather than being
read whole.

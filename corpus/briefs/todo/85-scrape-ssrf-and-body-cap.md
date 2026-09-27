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

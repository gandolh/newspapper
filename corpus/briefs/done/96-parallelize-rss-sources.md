# Task 96 — Search fetches RSS sources sequentially; total time is the sum, not the max

## Context

Found in the 2026-09 performance sweep and measured. `searchArticles`
([core/src/scrape/index.ts:92-131](../../../core/src/scrape/index.ts)) loops
sources one at a time:

```ts
for (const source of enabled) {
  items = await fetchFeed(source.rss, …);   // awaited serially
  … await Promise.all(candidates.map(fetchBody));  // bodies within a source ARE parallel
}
```

Sources are independent hosts, but each waits for the previous to finish. Measured
against a local mock (400 ms feed + 200 ms body per source): 1 src 646 ms, 3 src
1821 ms, 6 src 3633 ms — almost exactly `sources × 600 ms`, vs ~600 ms if
concurrent. Worse, each `fetchFeed`/`fetchBody` carries a 30 s timeout, so one
dead feed adds up to 30 s in front of every source queued behind it.

## What to do

- Run the per-source work concurrently:
  `await Promise.all(enabled.map(source => processOneSource(source)))`, keeping
  the existing per-source `Promise.all` over bodies. Optionally cap concurrency
  (e.g. 4-6) to be polite to hosts and bound memory — state the cap and why.
- Preserve current behaviour otherwise: per-source `onProgress` events still fire
  (order may interleave — fine), one bad feed still errors only itself
  (`errors[]`), and the final `matches.sort` ordering is unchanged.
- Combine with brief 85's per-hop SSRF guard cleanly (both touch the fetch path)
  — they are independent but adjacent.

## Acceptance

- A test (mock feeds/bodies via injected fetch or a local server): total time for
  N sources is ~max(source latency), not the sum; measure before/after and state
  it.
- Progress events for every source still arrive; a failing feed still yields an
  `errors[]` entry and does not fail the search; result ordering matches the
  current sort.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/scrape/index.ts` (+ `scrape.test.ts`)

## Files you must NOT touch

- keyword matching/ranking semantics (locked)
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-03

`searchArticles` now runs each source's work (`searchSource`: feed, then its
bodies in parallel as before) through `mapWithConcurrency` with
`SOURCE_CONCURRENCY = 4`. The cap is polite to hosts and bounds memory, since
each source already fetches up to `maxPerSource` bodies at once. Results are
kept per source and flattened **in source order** before the unchanged sort, so
the output equals the sequential search's. A failing feed still records only
its own `errors[]` entry and progress event.

Tests (`scrape.test.ts`, mocked feeds and bodies):
- 6 sources at 200 ms feed + 100 ms body each. The old code took **1815 ms**,
  as sequential predicts (6 × 300 ms). The new code is asserted under 1200 ms:
  two rounds of 4, about 600 ms.
- one failing feed (`s3`) yields exactly its error, every source emits
  `fetching`, and the tie order equals the sequential search's even when `s0`
  finishes last.

Finding: the existing comparator returns `-1` for equal `publishedAt`, so ties
come out reversed relative to insertion. That is locked ranking behaviour, so
it is preserved and documented in the test, not changed.

`npm test` 726/726, lint and build clean.

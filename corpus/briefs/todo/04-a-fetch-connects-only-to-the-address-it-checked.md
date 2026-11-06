# Task 04 — A fetch connects only to the address it checked

## Context

newspapper fetches URLs a third party chose: feed URLs and every item's
link (`core/src/scrape/rss.ts`, `core/src/scrape/body.ts`), through
`safeFetch` in `core/src/scrape/safe-url.ts`. `vetUrl` resolves the host and
refuses private addresses, and redirects are followed by hand with the same
check at every hop. The file's own comment names the gap that's left: the
check runs at resolve time, and `fetch` resolves the name again when it
connects, so whoever controls a feed's DNS (a short TTL) can answer a public
address to the check and a private one to the connect, and reach a service
on the VPS's loopback or the metadata address.

A look at hyperlight-dev/hyperagent on 2026-11-06 gave the recipe (its fetch
plugin checks every resolved address before connecting and the socket's
remote address after the handshake), and ro-housing has the same gap as its
todo `check-every-hop-of-a-pasted-link`. On 2026-11-06 the owner chose to
close it in newspapper now, since a feed decides what newspapper fetches
without anyone pasting a link.

## Owner decisions

Each has the default this brief builds if the owner says nothing else.

1. **How.** Default: **one resolution per connection.** `safeFetch` passes
   a dispatcher whose connect step resolves the host through the same
   vetting lookup and connects only to an address that passed, so there
   is no second resolution to rebind. Node's `fetch` takes an undici
   `dispatcher`; Node doesn't export undici's `Agent`, so this adds the
   `undici` package, pinned to the version the production image's Node
   bundles (`node -p process.versions.undici` inside the image), to keep
   the two from drifting. If that pairing fails in tests, the fallback is
   undici's own `fetch` from the same package for these calls only.
2. **IPv6 forms that carry an IPv4 address.** Default: judged as the IPv4
   they carry, like `::ffff:` already is: NAT64 (`64:ff9b::/96`) and the
   deprecated IPv4-compatible form (`::/96`). 6to4 (`2002::/16`) is
   blocked outright.

## What to do

1. The dispatcher, built once and reused: its connect lookup resolves with
   `all: true`, refuses the connection unless every address is public
   (`isPublicAddress`), and hands the connect only vetted addresses. A
   literal IP host is checked the same way.
2. `safeFetch` uses it for every hop. `vetUrl` stays as the early, cheap
   refusal, so a refused URL still never opens a socket. The injectable
   `lookup` in `SafeFetchDeps` reaches the dispatcher too, so tests can
   drive both.
3. `isPublicAddress`: the IPv6 forms of decision 2.
4. Replace the "Known gap" paragraph in `safe-url.ts` with a comment on
   what the code does now and why.
5. Tests (Vitest), with a local HTTP server on loopback:
   - a lookup that answers a public address to the first call and
     `127.0.0.1` to every later one (a rebinding): the fetch is refused
     and the loopback server sees no request;
   - a lookup that always answers `127.0.0.1`: refused before connecting;
   - a redirect to a host whose lookup answers private: refused;
   - `64:ff9b::7f00:1`, `::7f00:1` and `2002:7f00:1::` are not public;
   - a public answer still fetches (point the dispatcher at the loopback
     server through a test-only allowance, not by weakening the check).
6. Corpus: the pages under "Files you OWN", and `log.md`.

## Files you OWN

- `core/src/scrape/safe-url.ts`, `core/src/scrape/safe-url.test.ts`
- `core/package.json` and the lockfile (the one pinned dependency)
- `corpus/wiki/decisions-hardening.md` (its `safe-url.ts` entry: the
  connect-time check replaces the accepted rebinding gap, with a dated
  revisit line), `corpus/wiki/modules-reader.md` if its line on
  `safe-url.ts` changes, `corpus/wiki/dependencies.md` (the new pin, and
  why), and `corpus/log.md`

## Files you must NOT touch

- `rss.ts` and `body.ts` beyond what passing the dispatcher needs; the
  Reader's refresh loop in `api/`.
- Any other repo: ro-housing's todo stays its own.

## Acceptance

- The tests above pass; the full test run and the typecheck pass.
- A feed refresh against real feeds still fetches items (one manual run
  of the refresh against the seed feeds, or the existing scrape test).
- **Owner step:** `node cli.ts newspapper all` from vps-deploy.

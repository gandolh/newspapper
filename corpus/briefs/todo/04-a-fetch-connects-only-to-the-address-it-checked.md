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

**All answered 2026-11-06.** The owner first took the `undici` package for
decision 1, then, the same day, chose no new dependency.

1. **How.** **Decided: one resolution per connection, with no new
   dependency.** `safeFetch` stops using `fetch` for its requests and
   uses Node's own `node:http` and `node:https`, whose `lookup` option
   replaces the connection's DNS lookup: it resolves the host through the
   vetting lookup and hands the socket only an address that passed, so
   there is no second resolution to rebind. TLS still checks the
   certificate against the host name. A small adapter turns the answer
   into a web `Response`, so `rss.ts` and `body.ts` keep the API they
   use (status, headers, a body stream for `readCapped`). Turned down: the
   `undici` package, whose `Agent` would let `fetch` itself take the
   lookup (Node bundles undici but doesn't export it), since the owner
   preferred more code here to one more dependency.
2. **IPv6 forms that carry an IPv4 address.** **Decided:** judged as the IPv4
   they carry, like `::ffff:` already is: NAT64 (`64:ff9b::/96`) and the
   deprecated IPv4-compatible form (`::/96`). 6to4 (`2002::/16`) is
   blocked outright.

## What to do

1. The vetting lookup, in the shape `net.connect` calls it: both the
   single-address callback and `all: true` (which Node uses when it tries
   IPv4 and IPv6 in turn). It resolves the host, refuses with an error
   unless every address is public (`isPublicAddress`), and passes on only
   vetted addresses. A literal IP host is checked the same way.
2. The request: `http.request` or `https.request` with that `lookup`, the
   method, headers and `signal` from the caller's `init`, no redirects
   followed (`safeFetch` already follows them by hand, vetting each hop).
   The adapter builds a `Response` from the status, the headers and the
   body as a web stream (`Readable.toWeb`), with a null body for a 304
   or a 204. `fetch` used to undo `gzip`, `deflate` and `br` for us; the
   adapter does the same with `node:zlib`, keeping `readCapped`'s cap on
   the decompressed bytes. Network errors and aborts reject, as `fetch`
   did.
3. `safeFetch` uses it for every hop. `vetUrl` stays as the early, cheap
   refusal, so a refused URL still never opens a socket. The injectable
   `lookup` in `SafeFetchDeps` reaches the request too. `SafeFetchDeps.fetch`
   stays as the tests' seam: `rss.test.ts`, `reader/refresh.test.ts` and
   the API's `routes/reader.test.ts` pass a fake one, and when one is
   given `safeFetch` uses it instead of the real request, as today. Those
   tests don't change.
4. `isPublicAddress`: the IPv6 forms of decision 2.
5. Replace the "Known gap" paragraph in `safe-url.ts` with a comment on
   what the code does now and why.
6. Tests (Vitest), with a local HTTP server on loopback:
   - a lookup that answers a public address to the first call and
     `127.0.0.1` to every later one (a rebinding): the fetch is refused
     and the loopback server sees no request;
   - a lookup that always answers `127.0.0.1`: refused before connecting;
   - a redirect to a host whose lookup answers private: refused;
   - `64:ff9b::7f00:1`, `::7f00:1` and `2002:7f00:1::` are not public;
   - a public answer still fetches (point the request at the loopback
     server through a test-only allowance, not by weakening the check);
   - the adapter: a gzip body comes back decompressed and capped, a 304
     has no body, an abort rejects.
7. Corpus: the pages under "Files you OWN", and `log.md`.

## Files you OWN

- `core/src/scrape/safe-url.ts`, `core/src/scrape/safe-url.test.ts`
- `corpus/wiki/decisions-hardening.md` (its `safe-url.ts` entry: the
  connect-time check replaces the accepted rebinding gap, with a dated
  revisit line), `corpus/wiki/modules-reader.md` if its line on
  `safe-url.ts` changes, `corpus/wiki/decisions-engineering.md` (a line:
  scrape requests use `node:http`/`node:https`, not `fetch`, and why), and
  `corpus/log.md`

## Files you must NOT touch

- `rss.ts`, `body.ts` and the tests that inject `fetch` (step 3); the
  Reader's refresh loop in `api/`.
- `core/package.json`: no new dependency (decision 1).
- Any other repo: ro-housing's todo stays its own.

## Acceptance

- The tests above pass; the full test run and the typecheck pass.
- A feed refresh against real feeds still fetches items (one manual run
  of the refresh against the seed feeds, or the existing scrape test).
- **Owner step:** `node cli.ts newspapper all` from vps-deploy.

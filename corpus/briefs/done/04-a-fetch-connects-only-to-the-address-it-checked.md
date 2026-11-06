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

## Outcome (2026-11-06)

Built in `725a41a`. `safeFetch` makes its requests with `node:http` and
`node:https`, with `vettingLookup` as the connection's `lookup`: it resolves
the host, refuses with a `RefusedAddressError` unless every address is public,
and hands the socket only those, in both callback shapes (one address, and
`all: true`, which Node's address-family fallback uses). A refusal at connect
time makes `safeFetch` return `null`, the same as one at resolve time, so
`fetchFeed` reports it as a non-public URL and `fetchBody` as `''`. `vetUrl`
still runs first at every hop. No dependency was added; `rss.ts`, `body.ts`
and the tests that inject `fetch` are unchanged.

**The adapter** turns the answer into a web `Response`: every header (from the
raw list, so a repeated one stays repeated), a body through `Readable.toWeb`,
none for 204, 205 and 304, and an abort that rejects before the answer and
errors the body after it. Node 24's `fetch` sends `Accept-Encoding: gzip,
deflate` and keeps `Content-Encoding` in the response headers (checked against
a local server); the adapter does the same, and undoes gzip, deflate and br,
leniently on a truncated body as `fetch` does. Two calls made here: deflate is
the zlib format HTTP specifies, without `fetch`'s sniffing for raw deflate from
misconfigured servers (rare, and it would have cost the decoder's
backpressure); and kept-alive sockets sit in two agents only this module uses,
so a reused socket was opened through the same check. A request body is
refused, since nothing sends one.

**The test-only allowance** is `SafeFetchDeps.connectTo`: it maps an address
that already passed the check to where the socket goes, so a test answers a
public address and reaches its loopback server. The check itself is untouched
and still judges what the lookup answered. Chosen over an injectable
"is public" predicate, which would have weakened the check for the test.

**IPv6.** NAT64 (`64:ff9b::/96`) and IPv4-compatible (`::/96`) addresses are
judged as the IPv4 they carry, IPv4-mapped is now caught in hex form too
(`::ffff:7f00:1`; the old regex took only the dotted form), and 6to4
(`2002::/16`) is blocked whatever it carries. A zone id (`fe80::1%eth0`) is
stripped before the check.

**Tests.** `safe-url.test.ts` gains 28 cases (59 in all), against a server on
loopback: a lookup that answers public then loopback is refused with the
server seeing nothing; an always-loopback name is refused after one lookup,
before any connection; a redirect to a private name is refused after the first
hop; a public answer fetches with the caller's headers; gzip, deflate and br
bodies decode; an 8 MB gzip body read through a 256 KB cap returns exactly the
cap; a 304 has no body and `fetchFeedConditional` reports it as not modified;
aborts before the answer and during the body both reject; `vettingLookup`
directly in both callback shapes, with a family filter, a literal IP and a DNS
failure. Made to fail on purpose: with the connect-time refusal removed, the
rebinding test gets a 200 from the loopback server (and three `vettingLookup`
cases fail).

**Real feeds.** A throwaway build of `core` fetched hotnews.ro (gzip, 20
items), context.ro (identity, 10) and g4media.ro (gzip, 30) over TLS, and the
first item's body of each; `http://127.0.0.1:3001/` came back refused.

**Checks run:** the scrape, reader and API reader tests (7 files, 130 tests),
`npm run lint`, `npm run build` (format check, `tsc` for all three workspaces,
vite build). **Skipped:** the full `npm test` and `npm run gate`, which launch
real Chromium across many files on a shared machine; nothing in this change
touches rendering. The owner's gate run before the deploy covers them.

**Owner step:** `node cli.ts newspapper all` from vps-deploy, then refresh the
Reader once.

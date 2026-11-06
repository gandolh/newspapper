---
summary: Two hardening calls from the 2026-10-02 sweep — server-side fetches of feed-chosen URLs go to public addresses only (2026-10-02; since 2026-11-06 the connection itself goes only to a checked address, closing DNS rebinding), and a 5xx never shows the caller the exception's text (2026-10-02).
updated: 2026-11-06
---

# Decisions — hardening

Split out of [decisions-security.md](./decisions-security.md) on 2026-10-13 to
keep that page under the size cap. The text is unchanged.

## Server-side fetches of feed-chosen URLs go to public addresses only

_2026-10-02_ — Feed URLs and item links are fetched through
`core/src/scrape/safe-url.ts`:
- http(s) only;
- every resolved address must be public (private, loopback, link-local, CGNAT
  and IPv4-mapped forms are refused);
- redirects are followed by hand, with the check repeated per hop;
- bodies are capped (2 MB for articles, 10 MB for feeds).

Rejected: **trusting the feed host.** Sources are operator-added, but item
links are third-party. Rejected: `redirect: 'follow'`, since one public 302 is
all it takes to reach loopback.

**Revisited 2026-11-06: the connection goes only to an address that was
checked.** The 2026-10-02 version accepted a residual: the check ran at
resolve time, and `fetch` resolved the name again when it connected, so a
feed's DNS with a short TTL could answer a public address to the check and a
private one to the connection. A feed decides what newspapper fetches without
anyone pasting a link, so the owner chose to close it. Each request now goes
through `node:http`/`node:https` with `vettingLookup` as its `lookup`: the
connection resolves the host once, every address must pass the same check,
and the socket gets only those. TLS still checks the certificate against the
host name; a literal IP host is never resolved, so there is nothing to rebind;
kept-alive sockets live in the module's own agents, so each was opened through
the check. `vetUrl` stays as the early refusal, so a refused URL still opens
no socket, and a connect-time refusal makes `safeFetch` return `null`, the
same as one at resolve time. The same day, IPv6 forms that carry an IPv4
address (NAT64 `64:ff9b::/96`, IPv4-compatible `::/96`, and the hex form of
IPv4-mapped) are judged as that IPv4 address, and 6to4 (`2002::/16`) is
refused outright. Rejected: the `undici` package, whose `Agent` would let
`fetch` take the lookup (Node bundles undici but does not export it); the
owner preferred a small adapter here to one more dependency. Why the requests
use `node:http` rather than `fetch` is in
[decisions-engineering.md](./decisions-engineering.md#scrape-requests-use-nodehttp-not-fetch).

## A 5xx never shows the caller the exception's text

_2026-10-02_ — The global error handler answers any `>= 500` with
`{ "error": "Internal Server Error" }` and logs the real error. A deliberate 4xx
keeps its message. Rejected: echoing `err.message` for everything, which leaked
SQL fragments, file paths and null-dereference text.

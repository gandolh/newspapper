---
summary: Two hardening calls from the 2026-10-02 sweep — server-side fetches of feed-chosen URLs go to public addresses only (brief 85), and a 5xx never shows the caller the exception's text (brief 79).
updated: 2026-10-13
---

# Decisions — hardening

Split out of [decisions-security.md](./decisions-security.md) on 2026-10-13 to
keep that page under the size cap. The text is unchanged.

## Server-side fetches of feed-chosen URLs go to public addresses only

_2026-10-02 (brief 85)_ — Feed URLs and item links are fetched through
`core/src/scrape/safe-url.ts`:
- http(s) only;
- every resolved address must be public (private, loopback, link-local, CGNAT
  and IPv4-mapped forms are refused);
- redirects are followed by hand, with the check repeated per hop;
- bodies are capped (2 MB for articles, 10 MB for feeds).

Rejected: **trusting the feed host.** Sources are operator-added, but item
links are third-party. Rejected: `redirect: 'follow'`, since one public 302 is
all it takes to reach loopback. Accepted residual: the check is at resolve
time, so DNS rebinding remains possible until a connect-time check is worth
the machinery.

## A 5xx never shows the caller the exception's text

_2026-10-02 (brief 79)_ — The global error handler answers any `>= 500` with
`{ "error": "Internal Server Error" }` and logs the real error. A deliberate 4xx
keeps its message. Rejected: echoing `err.message` for everything, which leaked
SQL fragments, file paths and null-dereference text.

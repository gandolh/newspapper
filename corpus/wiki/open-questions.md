---
summary: What's still unresolved after the pivot — theme palettes, auth details, and how the article library feeds authoring.
updated: 2026-08-27
---

# Open Questions

Only what is actually open. The moment one is answered, **delete it from this
page** — the history belongs in [../log.md](../log.md).

The pivot itself is settled: see [decisions.md](./decisions.md) and
[markup.md](./markup.md). What follows is the residue.

## What are themes 2 and 3?

Three themes ship, sharing type/spacing/shape tokens and differing mainly in
primary color. `warm-industrial-1` exists (terracotta `#a2391a`). The other two
palettes have not been designed. This is design work, not a decision — it needs
the component library to exist before there's anything to look at.

## Auth details

Single account, username and password. Settled: `node:crypto` `scrypt` for the
hash, a signed cookie session with a 30-day expiry, and the account seeded from
environment variables at first boot. Still open: what happens on repeated failed
attempts, and whether the password can be changed from inside the app.

## How does a saved article become a post?

The RSS library saves articles you pick. Authoring happens in `.wzd`. Nothing
connects them yet — copy and paste is the assumed answer, but a "start a post
from this article" action is the obvious affordance and nobody has decided
whether it exists.

## Keyword matching in the scraper

Scrapers are the declared RSS feeds, fetched and filtered by keywords you
supply. Unspecified: which fields are matched (title only, or title + body),
whether multiple keywords are AND or OR, and whether matching is fuzzy.

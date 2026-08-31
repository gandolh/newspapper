---
summary: What's still unresolved after the pivot — theme palettes, auth details, and how the article library feeds authoring.
updated: 2026-08-28
---

# Open Questions

Only what is actually open. The moment one is answered, **delete it from this
page** — the history belongs in [../log.md](../log.md).

The pivot itself is settled: see [decisions.md](./decisions.md) and
[markup.md](./markup.md). What follows is the residue.

## How does a saved article become a post?

The RSS library (brief 60) saves articles you pick. Authoring happens in
`.wzd`. Nothing connects them yet — copy and paste is the assumed answer.
Brief 60 deliberately did **not** build a "start a post from this article"
action (it was in scope in the original brief text, but the dispatch for that
wave withdrew it as undecided and left it for the editor brief, 59, to own).
The API already has what such an action would need — `Article.title` and
`Article.url` are enough to seed a starter `.wzd` document — so adding
`POST /api/articles/:id/start-post` later is additive, not a redesign.

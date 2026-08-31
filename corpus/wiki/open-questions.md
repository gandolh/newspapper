---
summary: The two things genuinely still undecided — how a saved article becomes a post, and the four parts of the design spec the chrome has not yet grown. Everything the rebuild settled has been deleted from here.
updated: 2026-08-31
---

# Open Questions

Only what is actually open. The moment one is answered, **delete it from this
page** — the history belongs in [../log.md](../log.md).

The pivot itself is settled, and so is everything the rebuild touched: see
[decisions.md](./decisions.md) and its three sibling pages. What follows is the
residue.

## How does a saved article become a post?

The article library saves the items you pick from an RSS search. Authoring
happens in `.wzd`. **Nothing connects them** — copy and paste is the assumed
answer, and it is still the only one; there is no `start-post` route or action
anywhere in the code.

Brief 60 deliberately did not build a "start a post from this article" action
(it was in scope in the original brief text, but the dispatch for that wave
withdrew it as undecided and left it for the editor brief, 59, to own — which
also did not build it). The API already has what such an action would need:
`Article.title` and `Article.url` are enough to seed a starter document, so
`POST /api/articles/:id/start-post` remains additive, not a redesign.

## Four parts of the design spec the chrome does not carry

Not undecided so much as unbuilt, and each is blocked on changing a structure
rather than a style. They are listed with their reasons in
[design-components.md § 9](./design-components.md#9-what-the-shipped-chrome-does-not-yet-carry):
the scale-chip row for constrained props, the thumbnail strip, `/posts` as a
grid of boards rather than a list, and the wax half of the compile animation.

Whether any of them is worth a brief has not been decided.

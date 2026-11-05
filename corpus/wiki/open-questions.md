---
summary: One question is open (2026-11-05) — how a text selection inside the galley's waxed element should show, since both are the same wax. The two before it were settled on 2026-09-01.
updated: 2026-11-05
---

# Open Questions

Only what is actually open. The moment one is answered, **delete it from this
page** — the history belongs in [../log.md](../log.md), and the outcome in
[decisions.md](./decisions.md) or a brief.

## Open

- **How does a selection inside the waxed element show?** (2026-11-05, the
  owner's call.) Since 2026-11-05 (brief 03) the galley paints a text selection as wax under
  wax-ink, at the text's height, the same wax as the run that marks the
  selected element ([chrome.md](./chrome.md)). A click selects the element under
  the caret, so most selections lie inside that run: a selected word of a
  heading keeps its text readable but shows no extent. Telling the two apart
  is a visible change beyond "wax-ink on wax" in
  [design-components.md §7](./design-components.md#7-browser-surfaces), such as
  a deeper wax where they overlap (two layers of wax; `--wax-ink` on
  `#ebb93a`, the two waxes multiplied, computes to about 6.8:1). Options: a
  deeper wax on the overlap, a different selection ground, or leave it.

## Settled

The two that survived the v4 rebuild were both settled on 2026-09-01:

- *How does a saved article become a post?* — it does not. A saved article is a
  reference, not a pipeline input; see
  [decisions.md](./decisions.md#a-saved-article-is-a-reference-not-a-pipeline-input).
- *Which design-spec gaps are worth building?* — two are
  the chrome's finish (2026-09-01) and two were dropped, in
  [design-components.md §9](./design-components.md#9-what-the-shipped-chrome-does-not-carry).

An empty page here is the goal state, not a gap. If a question sits here for
weeks it is usually because nobody will pay the cost of deciding it — say so and
close it, rather than letting it read as pending work.

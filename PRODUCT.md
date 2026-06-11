# Product

## Register

product

## Users

A single, technical user (the developer/operator) running newspapper locally on their
desktop. Context: at a real computer, deliberately producing a daily Instagram-style news
carousel. Not a multi-tenant or public app — there is no auth, no mobile-first usage, no
unknown audience. The user is in a focused, repeated *task* (scrape → compose → edit →
export), not browsing.

## Product Purpose

Turn today's RSS news into a polished Instagram-style slide post (1080×1080 PNGs) through a
four-step wizard, with a visual template builder behind it. Success = the user gets a
correct, good-looking post out the door quickly, and trusts every step (clear states, no
surprises). The tool should disappear into the task.

## Brand Personality

Warm editorial, soft brutalism, confident. Three words: **warm, editorial, deliberate.**
Terracotta (`#a2391a`) accent on a warm off-white editorial surface, Inter throughout. The
warmth comes from the accent + type + rhythm, not from decoration.

## Anti-references

- Generic SaaS-cream dashboards with an eyebrow kicker on every section.
- Over-decorated, motion-heavy "delightful" tool UIs — this is a focused workstation.
- Floating narrow content marooned in a sea of empty space (the current failure mode).

## Design Principles

1. **The tool disappears into the task** — earned familiarity over novelty; standard
   affordances for standard jobs.
2. **Every state is designed** — loading, empty, error, validation, selected. No happy-path-only screens.
3. **Deliberate density** — a workstation can be information-dense; use width intentionally rather than padding everything to a narrow column.
4. **Warmth through accent and rhythm, not ornament** — terracotta + spacing carry the brand; no gratuitous gradients, glass, or side-stripes.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the operator's own use: body text ≥4.5:1, visible focus rings (already
present), keyboard paths through every flow, and a `prefers-reduced-motion` alternative for
any motion added. No specific assistive-tech requirement is known; build to AA as the floor.

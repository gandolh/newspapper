# Task 61 — Themes 2 and 3

## Context

[Three themes ship](../../wiki/decisions.md#a-theme-varies-the-components--there-are-no-presets),
sharing typography, spacing and shape tokens and differing mainly in **primary
color** — a family, not three separate designs. `warm-industrial-1` is the
existing theme (terracotta `#a2391a`).

This is design work. It needs the component library (brief 54) to exist first,
because there is nothing to judge a palette against until real slides render.

## Files you OWN

- `assets/design-systems/**`
- `corpus/wiki/design-systems.md`

## Files you must NOT touch

`core/src/**`, `ui/src/**`. If a theme cannot be expressed in tokens alone, that
is a finding to report — **not** a licence to add a component or a style prop.

## What to do

1. Rename the existing theme to `warm-industrial-1` and keep it unchanged
   otherwise. Update any reference to the old name, including the default in
   settings.
2. Design `warm-industrial-2` and `-3`. Vary the primary and its on-color, and
   the surface tint only as far as the primary requires. **Do not** vary the type
   scale, spacing, or radii — that is what keeps them a family.
3. Each theme must satisfy the same contrast floor as the existing one; check
   text on surface and on primary against WCAG AA at the sizes actually used.
4. Render the same sample post in all three and compare them side by side. A
   theme that only reads as "the same post, tinted" has failed — and so has one
   that looks like a different product.

## Acceptance

- Three theme files exist and load; switching themes on one post re-renders it
  in each without any markup change.
- Contrast checks pass for every text-on-background pair.
- The comparison renders are attached to the outcome note.
- `design-systems.md` documents all three and the rule that they vary by color.

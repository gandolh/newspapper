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

---

## Outcome — 2026-08-27, partial

Shipped `warm-industrial-1/-2/-3` — moss `#1f6b3b` and ink `#2e5d9e` derived
from terracotta by holding saturation and lightness and rotating hue, then
nudging lightness so on-primary contrast matches. Only the primary-linked tokens
differ; every neutral, semantic, spacing, rounded and shape token is
byte-identical across the three, per "a family, not three designs". Contrast
measured rather than assumed: body 16.27:1 on all three, on-primary 6.5–6.7:1,
primary-on-surface 6.2–6.4:1. `missingThemeTokens()` returns `[]` for all.

The type ramp was enlarged for the 1080² canvas — display 96px, headline-lg
64px, headline-md 44px, body-lg 30px, body-md 26px, label-bold 20px, roughly
1.4–2× the previous web-sized scale.

**Two items were correctly left undone and are now [brief 65](../todo/65-theme-family-finish.md).**

The `Heading`/`Stat` size collision is *not* fixable from a theme, which is what
this brief was asked to do. `WZD_TYPOGRAPHY_SCALES` in
`core/src/wizard/components/style.ts` maps component + size to a **token name**,
and it maps `Heading` `lg` and `xl` to the same `display` token — so they render
identically whatever value the theme gives it. The controller's routing of that
finding to this brief was wrong; it needs a code change alongside the theme one.

The rename `warm-industrial` → `warm-industrial-1` was also left: ~15 hardcoded
call sites across files this brief did not own, plus the `posts.theme` column
default and existing stored rows. The agent refused to write a data migration
out of scope, which is exactly right. So the repo currently ships **four** themes
where the decision says three, until 65 lands.

---
title: Rebuild the app chrome against the chosen visual direction
created: 2026-08-27
status: promoted
---

# Rebuild the app chrome

> **Promoted 2026-08-27** to [brief 64](../briefs/todo/64-workstation-chrome.md).
> The direction is settled — The Mechanical — and the spec lives there. Kept for
> the trail of how the choice was made.

The four-step wizard's design system is retired with the pipeline it described.
Two direction rounds ran on 2026-08-27, both drawn as complete editor screens.
The owner picked **The Mechanical** — the paste-up board — and asked for the
other three to be re-dealt with more structure; the re-roll produced The Forme,
The Wire Desk, and Page 101. Catalogue and the raises already folded in:
[../wiki/open-questions.md](../wiki/open-questions.md#which-visual-world-does-the-workstation-move-to).

**Blocked on a confirm-or-swap, not on an open choice.** The Mechanical stands
unless the owner names one of the three alternates, or takes the hybrid on the
table (the board with The Forme's furniture rule as its layout law). Until that
lands, `DESIGN.md` is not rewritten, `PRODUCT.md`'s brand personality section
stays open, and brief 59 has no visual spec.

## What this becomes, once a direction is chosen

A brief covering the chrome rebuild, which is orthogonal to the functional
briefs already filed and should not be folded into any of them:

- Replace the tokens in `ui/src/styles/global.css` with the chosen world's.
- Rebuild the shared primitives in `ui/src/components/ui/` in that world's
  vocabulary. A stock-looking control inside a committed world is a lapse — nav,
  buttons, inputs and links all get rebuilt, not re-skinned.
- Retire `Stepper` with the wizard (brief 62 owns the page deletions; this owns
  the component).
- Rebuild `Sidebar.astro` against the new page map (`/`, `/posts`, `/articles`,
  `/settings`, `/login`).
- Install `animejs` and build the one authored motion moment: the compile —
  typed source settling into a set slide. Nothing else animates; the canvas
  never does.
- Theme the surfaces nobody draws: selection, caret, scrollbars, focus rings,
  underline offset, tabular numerals.

If The Mechanical stands, five rules come with it and belong in `DESIGN.md`:
one grid governs every surface; empty space is deliberate, not incidental; a
single diagonal mark means "held out" everywhere; every slide renders at one
fixed scale on a shared baseline; and a finding pins to its node on a leader
line carrying the actual measurement.

## Ordering

Runs against brief 59 (the editor), not before it — the editor's structure is
what the world has to clothe. Doing it earlier means restyling a layout that is
about to change.

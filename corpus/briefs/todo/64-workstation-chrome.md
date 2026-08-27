# Task 64 — Rebuild the app chrome as The Mechanical

## Context

The four-step wizard's design system is retired with the pipeline it described.
The replacement world is **The Mechanical** — a paste-up board — chosen by the
owner on 2026-08-27 after two direction rounds. The full system, derived from
the approved comps, is [`DESIGN.md`](../../../DESIGN.md) at the repo root;
[`PRODUCT.md`](../../../PRODUCT.md) carries the register. Read both before
touching anything. Do not re-derive the palette, the marks, or the grid — they
are measured values, not suggestions.

The one-line version: a 26px non-photo blue grid under everything; the slide
pasted down inside crop marks and register targets; the markup waxed on beside
it as a galley; the inspector on a tissue overlay that hinges off the canvas.
Zero radius anywhere. State is a **mark**, never a coloured badge.

This brief is orthogonal to the functional briefs. It changes how things look
and how state is expressed; it does not change what any route does.

## Files you OWN

- `ui/src/styles/global.css` — replace the token block wholesale
- `ui/src/components/ui/**` — every shared primitive
- `ui/src/components/Sidebar.astro` — becomes the tray
- `assets/fonts/` — add the two chrome faces
- `ui/package.json` — add `animejs`
- `corpus/wiki/design-systems.md`

## Files you must NOT touch

- `assets/design-systems/warm-industrial.json` and everything the renderer uses to paint the 1080² slide. **The slide theme is out of scope.** If a change seems to require touching it, you have misread the brief.
- `core/src/**`, `api/src/**`
- The editor's *structure* — brief 59 owns the three-pane layout and the selection model. This brief clothes it.

## What to do

**1. Fonts.** Self-host **Archivo** (variable, `wdth` 62–125, `wght` 100–900)
and **Spline Sans Mono** (variable) into `assets/fonts/`, served the way the
Inter TTFs already are. Inter stays — it is the *slide* face and must not appear
in the chrome. Declare real fallback stacks.

**2. Tokens.** Replace `:root` in `global.css` with the palette, type scale,
spacing and shadow values in `DESIGN.md` §2–§4. Note two things the spec is
explicit about and that are easy to get wrong:

- `--radius*` is `0`. Delete the radius scale rather than setting it to zero in
  three places; a leftover radius token invites a rounded corner later.
- `graphite-soft` (`#6d6a62`) is the lightest colour any **text** may take.
  `graphite-tint` (`#7a7a76`) measures 4.0:1 on board and is for rules and ticks
  only. Do not use it for a label because it looks nicer.

**3. Primitives.** Rebuild `ui/src/components/ui/**` in the world's vocabulary.
A stock-looking control inside a committed world is a lapse — square every
corner, replace the badge with a mark, and give buttons the waxed shadow only
where they are objects on the board. Keep the Base UI foundation and the
existing wrapper APIs (`Select`'s `onValueChange`, `Toggle`'s `onCheckedChange`)
so nothing downstream has to change.

Retire `Stepper` — it has nothing left to describe. `Badge` is replaced by the
**mark** set (`DESIGN.md` §5): rubylith wash, wax highlight, rubber stamp,
tissue corner, 45° hatch.

**4. The tray.** `Sidebar.astro` becomes the tray: a full-width 78px strip,
compartments divided by 1px rules, nav against the new page map (`/`, `/posts`,
`/articles`, `/settings`, `/login` — brief 62 owns the routes). Each compartment
is a **showing**: it renders as the thing it produces, not as a label.

**5. Marks, applied consistently.** Implement each mark once, as a shared
primitive, and use it everywhere the state occurs. In particular **rubylith is
the only way the app says "held out"** — a slide excluded from a render, an
unavailable component, a post that will not compile. If you find yourself
designing a second treatment for that idea, stop.

**6. Motion.** Add `animejs` (pin the exact installed version — no caret). Build
exactly two moments: **the compile** (typing settles → changed lines take the
wax briefly → the stage re-sets) and **the hinge** (a real rotation of the
tissue about its top edge). Nothing else animates. Gate both behind
`prefers-reduced-motion` with the reduced path being the end state, immediately.
**Do not animate the canvas.**

**7. Browser surfaces.** Theme selection, caret, scrollbars, focus rings,
underline offset, and set `font-variant-numeric: tabular-nums` on every column
of digits. This is `DESIGN.md` §7 and it is not optional polish — it is the
cheapest signal the app was built rather than assembled.

**8. Update `corpus/wiki/design-systems.md`** to describe the shipped chrome,
replacing the "being replaced" notice.

## Ordering

**Runs against brief 59, not before it.** The editor's structure is what this
world has to clothe; styling a layout that is about to change wastes the work.
Brief 62 must have landed the page map first, or the tray has nothing to point
at.

## Acceptance

- Every page renders in the new world; no screen still shows a rounded corner, a coloured status pill, a stepper, or Inter in the chrome.
- Every element snaps to the 26px grid at every breakpoint tested.
- Each state in `DESIGN.md` §5's mark table is implemented once and used everywhere that state occurs — verified by grep, not by memory.
- The 1080² output is byte-identical to before this brief: `assets/design-systems/` is untouched and a re-render of an existing post produces the same image.
- Two animations exist and no more; both no-op under `prefers-reduced-motion`; the canvas never moves.
- Contrast: every text colour ≥4.5:1 against its own surface, placeholders included. Measure, don't eyeball.
- `npm run build`, `npm test`, `npm run lint` pass.
- `corpus/wiki/design-systems.md` describes what shipped, and `DESIGN.md` is re-derived from the built UI where it drifted from the comps.

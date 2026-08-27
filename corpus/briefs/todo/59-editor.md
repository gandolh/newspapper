# Task 59 — The split-screen editor

## Context

This is the product. A person writes a post in
[Newspapper Wizard](../../wiki/markup.md) in a three-pane editor: **source**,
**live preview**, and an **inspector + component palette**. Dragging a component
or changing a prop edits the markup immediately, written back
[through the formatter](../../wiki/decisions.md#format-and-lint-the-markup-like-jsx)
so the source pane always reads as though a person typed it.

The markup text is the single source of truth. The visual panes are views of it;
they never hold state the source doesn't.

Depends on briefs 53 (parse/format/lint) and 54 (compile). The builder from
brief 40 — canvas, tree panel, token-aware inspector, undo/redo — is the
starting material; brief 58 hands it over.

## Files you OWN

- `ui/src/pages/index.astro` — the editor becomes the front page
- `ui/src/components/editor/**` — rebuild
- `api/src/routes/preview.ts`

## Files you must NOT touch

`core/src/wizard/**` (consume it), `core/src/render/**`, the auth guard.

## What to do

**1. Layout.** Three panes: source (left), preview (centre), inspector +
palette (right). Panes are resizable; the layout must survive a narrow window
without becoming unusable.

**2. Source pane.** A text editor with Wizard syntax highlighting, lint findings
shown inline at their reported positions, and a manual **Format** action. Typing
in the source updates the preview on a debounce.

**3. Preview.** Renders the compiled slides in the browser. It must use core's
browser-safe interpreter path rather than a second implementation — the existing
`resolveStyleBrowser` in the old builder canvas is a *divergent* copy of core's
`resolveStyle` (it silently falls back where core throws), and reintroducing
that split would let the preview show something the renderer refuses. Unknown
tokens surface as a **visible warning on the node**, per
[the decision](../../wiki/decisions-engineering.md#the-builder-preview-is-strict-and-says-so).

**4. Selection is bidirectional.** Clicking a node in the preview selects the
element in the source; putting the cursor in the source highlights the node.
This needs the AST source positions from brief 53.

**5. Inspector.** Shows the selected component's allowed props from the
catalogue, as controls bound to the scale (`size`, `align`, `emphasis`). Changing
one rewrites that element's props in the markup and reformats. There is **no raw
CSS field** — do not add an "advanced" escape hatch.

**6. Palette.** Drag a component into a slide. Drops are **slots between
existing children**, not free positions — the layout is flow, never absolute.

**7. Saving.** Autosave the markup on a debounce; `<head>` drives the derived
metadata columns. New post opens a hello-world starter document.

## Acceptance

- A post can be written end to end in the editor and rendered, without ever
  touching the source pane — and equally, without ever touching the visual panes.
- A visual edit produces exactly the text a person would have typed: after any
  drag or prop change, the source is formatter-canonical.
- Preview and final render agree — a template the renderer would reject shows a
  warning in the preview rather than rendering happily.
- Selection round-trips both ways.
- No second copy of style resolution exists in `ui/`.

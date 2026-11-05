---
title: A text selection in the galley hides the text it selects
created: 2026-11-05
status: open
tags: [chrome, editor, bug]
---

# A text selection in the galley hides the text it selects

Select a range in the source pane (drag, Shift+arrows, or `setSelectionRange`)
and the selected characters disappear under a flat block of wax. Only the
selection is affected: with a caret, the selected element's wax run sits under
the text and every glyph is whole, so the 2026-10-19 wax fix works.

## Why

The source pane is a transparent `<textarea>` laid over the galley's `<pre>`,
which draws the visible text. `SourcePane.module.css` gives the textarea

```css
.input::selection {
  background: var(--wax);
  color: transparent;
}
```

The textarea paints above the galley, so the opaque wax background covers the
galley's glyphs, and the textarea's own glyphs are transparent. The selected
text is drawn by nothing. The selection box also uses the full line height,
taller than the wax run under it.

[design-components.md §7](../wiki/design-components.md) says a text selection
is wax on wax-ink, and [chrome.md](../wiki/chrome.md) already lists
`::selection` among the states a contrast sweep cannot see. The rule has been
there since the editor's first commit (`f315e01`); it is older than the
2026-10-19 wax fix. The 2026-10-09 `editing.gif` shows it too: in the frames
after the heading is selected, everything after `<Heading size="xl">` is a
blank wax bar.

## What it blocks

Brief 01 (retake the editing GIF). Its first beat selects slide 1's heading,
and a faithful retake shows the heading's text gone under the wax. Reproduced
2026-11-05 in the local app at 1280×800.

## Acceptance

With a range selected in the galley, the selected text stays readable in
wax-ink on wax, and the selection paints no wider or taller than the wax run.

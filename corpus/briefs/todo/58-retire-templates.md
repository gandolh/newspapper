# Task 58 — Retire `TemplateDoc`, the templates, and `/builder`

## Context

[The template system is removed](../../wiki/decisions.md#the-template-system-is-removed):
layout authoring is not a user activity now that built-in components plus a
theme cover it. This supersedes the 2026-06-10 templates-as-JSON decision.

**Sequencing matters.** Do not start this until brief 54 renders real slides
through the component library — until then the templates are the only thing that
renders, and deleting them leaves the app with no output at all.

The builder's canvas, tree panel, inspector and undo/redo are **not** being
thrown away; brief 59 rebuilds the editor on them. Read that brief before
deleting anything under `ui/src/components/builder/`, and hand over whatever is
worth keeping rather than letting brief 59 rediscover it.

## Files you OWN

Delete:
- `assets/templates/**` (the nine JSON documents)
- `core/src/templates/registry.ts`
- `api/src/routes/templates.ts`
- `ui/src/pages/builder.astro`, `ui/src/components/builder/**`

Edit:
- `core/src/index.ts` — drop the registry exports
- `core/src/types.ts` — remove `TemplateDoc`, `FieldSpec`; **keep** `TNode`,
  `TStyle`, `Theme`
- `core/src/templates/interpreter.ts` — keep. It is the compile target now.
  Consider moving it to `core/src/render/` if nothing template-shaped remains
  around it.
- `ui/src/lib/types.ts`, the nav/sidebar

## Files you must NOT touch

`core/src/wizard/**`, `core/src/render/**` internals, `core/src/storage/**`.

## What to do

1. Confirm brief 54 has landed and slides render through the component library.
2. Delete the files above, then follow the compiler.
3. Keep `renderTemplate` / `resolveStyle` / `validateSlideData` — they are how a
   `TNode` becomes HTML, and the whole compile chain depends on them.
4. Copy the nine template JSONs into `corpus/briefs/superseded/` **or** confirm
   they remain in git history and note the commit in your outcome note. They are
   the reference for how the built-in components should look, and losing them
   silently would be a real loss.
5. Update `corpus/wiki/design-systems.md` and `modules.md`.

## Acceptance

- `npm run build`, `npm test`, `npm run lint` all pass.
- `grep -ri "TemplateDoc\|templatesForFamily\|loadTemplate" core/src api/src ui/src`
  returns nothing.
- The app renders a post end to end with no `assets/templates/` directory present.
- `/builder` is gone from the nav and returns 404.

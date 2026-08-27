# Task 51 — Strip the AI surface

## Context

Newspapper no longer calls a language model — see
[No LLM in the product](../../wiki/decisions.md#no-llm-in-the-product). Every
Ollama-shaped surface comes out. This is pure deletion: nothing here is replaced
by new behaviour, and it unblocks the rest of the pivot by removing code the
later briefs would otherwise have to keep compiling.

Verified coupling (2026-08-27): `compose/` is reachable only through the
`core/src/index.ts` barrel. The API consumers are `routes/posts.ts`
(`composePost`, `generateCaption`, `parsePost`, `DEFAULT_PROMPT`),
`routes/prompt.ts`, `routes/settings.ts` (`OllamaClient`), `routes/slide-ai.ts`
and `server.ts`.

## Files you OWN

Delete outright:
- `core/src/compose/**` (the whole directory, tests included)
- `core/src/storage/prompt.ts`
- `api/src/routes/prompt.ts`, `api/src/routes/slide-ai.ts`
- `ui/src/pages/prompt.astro`, `ui/src/components/prompt/**`
- `ui/src/components/wizard/ComposeStep.tsx`, `ComposeStep.module.css`
- `data/prompt.md`

Edit:
- `core/src/index.ts` — drop the whole Compose export block
- `core/src/storage/settings.ts`, `core/src/types.ts` — remove `ollamaHost`,
  `ollamaApiKey`, `ollamaModel` from `Settings`, its defaults and its `ENV_MAP`.
  `defaultTheme` is the only setting left.
- `api/src/server.ts` — unregister the deleted routes
- `api/src/routes/posts.ts` — remove the compose and caption endpoints
- `api/src/routes/settings.ts` — remove the Ollama connection-test endpoint
- `ui/src/components/settings/SettingsIsland.tsx` — remove the Ollama fields
- `ui/src/components/export/ExportStep.tsx` — remove the "Generate caption"
  button and its handler; the caption textarea stays, hand-edited
- `ui/src/components/wizard/Wizard.tsx` — drop step 2, renumber to 3 steps
- `ui/src/lib/types.ts` — mirror the `Settings` change
- `.env.example` — drop the `OLLAMA_*` vars

## Files you must NOT touch

`core/src/templates/**`, `core/src/render/**`, `core/src/scrape/**`,
`core/src/storage/{db,posts,articles,sources}.ts`, `ui/src/components/builder/**`,
`ui/src/components/editor/**`. Brief 58 owns the template teardown; brief 59
owns the editor.

## What to do

1. Delete the files listed above.
2. Follow the compiler: `npm run build` will name every remaining reference.
3. Where a route disappears, remove its UI caller too — do not leave dead fetches.
4. Update `corpus/wiki/api.md` (routes removed) and
   `corpus/wiki/modules.md` (compose module gone). Do **not** rewrite
   `architecture.md` — brief 63 owns the narrative docs.

## Acceptance

- `npm run build` and `npm test` pass; `npm run lint` clean.
- `grep -ri "ollama" core/src api/src ui/src` returns nothing.
- The app still starts, scrapes, renders and exports; the wizard has 3 steps.
- No route returns 500 because its handler was half-removed.

---

## Outcome — 2026-08-27

Done. Deleted `core/src/compose/**` (8 files), `core/src/storage/prompt.ts`,
`api/src/routes/{prompt,slide-ai}.ts`, `ui/src/pages/prompt.astro`,
`ui/src/components/prompt/**`, `ui/src/components/wizard/ComposeStep.*`, and
`data/prompt.md`. `Settings` is now `{ defaultTheme: string }`.

Tests 179 → 142. Every removed test covered deleted code; the two Ollama-masking
tests in `server.test.ts` were replaced with `defaultTheme` round-trip tests so
the settings route kept its coverage rather than losing it.

Four things the brief did not anticipate, all found by the compiler or the
`grep -ri ollama` acceptance gate: `core/src/util/config.ts` carried unused
`ollamaHost`/`ollamaModel` on `Config`; `api/src/routes/render.ts` imported a
dead `OllamaError` whose catch arm was identical to the other; the `PUT` handler
in `api/src/routes/posts.ts` called `parsePost` and discarded both the result
and its exceptions; and `Sidebar.astro` still linked to the deleted `/prompt`
page.

**Deferred to brief 59.** `ui/src/components/editor/EditPanel.tsx` still calls
the deleted `POST /api/slide-ai` from the "✦ AI" menu and the cross-family
variant-remap flow. That file is on this brief's must-NOT-touch list, and the
conflict was resolved in favour of the ownership boundary: removing the calls
properly means deciding what cross-family variant switching does *without* an AI
remap, which is a design question, not a deletion. Those buttons currently 404
into a failure toast. Brief 59 owns `ui/src/components/editor/**` and rebuilds
it wholesale.

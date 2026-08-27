# Change Log

Append-only. Format: `## [YYYY-MM-DD] action | summary`

---

## [2026-05-06] init | created wiki from existing docs/, .claude/ context files, and docs/todos/

## [2026-05-12] refactor | simplified pipeline: SQLite-only storage, dropped group/export/summarize/query-entities, new format REPL command (Ollama-only), generate takes post dir; removed openai/@xenova/ml-distance deps

## [2026-05-12] remove | dropped Playwright entirely; scraping now HTTP+RSS only; rendering uses @napi-rs/canvas (already in place)

## [2026-05-18] rewrite | v2 plan: deleted all src/, simplified to a single `newspapper run` command (scrape RSS → compose via Ollama → render via Satori); dropped entity extraction, REPL, second theme, OpenAI, Playwright, canvas, sharp, cheerio, compromise, inquirer, ora, handlebars; SQLite kept for article dedupe + post history; versioned output folders per same-day re-run

## [2026-05-18] docs | rewrote index, commands, architecture, data, modules, configuration, design-systems, dependencies, CLAUDE.md, README.md, and .env.example to match v2 plan; deleted design-systems/digital-broadsheet.yaml and stale docs/superpowers/

## [2026-05-18] scaffold | npm init + tsconfig (ESM, NodeNext, react-jsx) + vitest.config + stub src/cli.ts with run/sources/list/clean via cac; installed pinned deps: rss-parser, better-sqlite3, satori, @resvg/resvg-js, react, dotenv, cac (runtime) and typescript, tsx, vitest, @types/node, @types/react, @types/better-sqlite3 (dev); converted warm-industrial.yaml → .json; switched scrape from RSS-only to RSS-for-discovery + per-article body fetch with regex HTML strip; updated docs accordingly; un-gitignored fonts/

## [2026-05-18] implement | full v2 pipeline: util/{config,logger,paths}, storage/{db,articles,posts}, scrape/{rss,body,index}, compose/{ollama,prompt,parse,index}, render/{theme,fonts,satori,resvg,slides/{frame,title,body,quote,index}}, commands/{sources,list,clean}, run.ts orchestrator wired into cli.ts. Replaced Epilogue/Manrope/Newsreader (broken under opentype.js variable-font parsing) with Inter (static TTFs from rsms/inter v4.0) at weights 400/500/600/700/800/900. Sample render verified visually — title-main, body-list, quote-pullout, body-comparison, title-statement all clean. 20 tests passing (stripHtml, parsePost, 9-variant end-to-end render). Added starter data/sources.json (BBC + Guardian + Reuters); updated .gitignore to track sources.json under data/.

## [2026-05-24] cleanup | removed dead v1 prompts/ dir (format-preview.hbs, format-slides.hbs), removed unused px() from src/render/theme.ts, deduped error-handling in src/cli.ts via shared handle() wrapper

## [2026-05-24] restructure | consolidated root: design-systems/ + templates/ + fonts/ → assets/, newspaper-infra/ → infra/, soul.md → docs/soul.md. Updated path refs in src/render/{theme,fonts}.ts and docs.

## [2026-06-10] rebuild | v3: CLI → web app (Fastify API + Astro UI), Satori → Chromium, JSON template system + visual builder

## [2026-06-11] ui | design-system pass: tokenized color drift, centered content-width strategy, de-slop, responsive sidebar/stepper/table, skeletons + favicon + reduced-motion. Added DESIGN.md + PRODUCT.md + a design-tool sidecar; extracted PageHeader + Skeleton primitives. Updated design-systems.md.

## [2026-06-11] ui | Base UI integration: added @base-ui/react@1.5.0; rebuilt shared primitives (Button, Input, Select, Toggle/Switch, Modal/Dialog, Toast) on Base UI with stable token-styled APIs (Select→onValueChange, Toggle→onCheckedChange). Extracted single Sidebar.astro (consistent Lucide icons) used by all pages; added ClientRouter view transitions. Builder: template picker → highlighted left-column list, Inspector fields routed through shared components + enlarged, removed dead StyleEditor prop + repeat-source duplicate-option bug. Updated dependencies.md + design-systems.md.

## [2026-08-27] maintenance | docs/ → corpus/ as a curated wiki; repo cleanup

Migrated the flat `docs/` wiki to a `corpus/` on the current corpus convention.
The nine reference pages moved verbatim to
`corpus/wiki/` and each gained `summary:`/`updated:` frontmatter;
`docs/log.md` became `corpus/log.md` (this file); `docs/index.md` was replaced by
a generated catalog. Added the missing spine — `overview.md`, `decisions.md`,
`status.md`, `open-questions.md` — plus `corpus/CLAUDE.md`, `routing.md`, and
`lint.sh` (frontmatter, link resolution, 200-body-line cap, abandoned path roots,
`--index` catalog generation). `glossary.md` deliberately not created: no term
has been formally settled yet, and an empty glossary teaches a fresh agent
nothing.

The 13 numbered v3 swarm briefs moved from `plans/swarm/` to
`corpus/briefs/done/` with their numbers intact; `plans/swarm/reference/`,
`README.md`, and `NEEDS.md` stayed put, so the path references inside those
briefs remain accurate.

Cleanup in the same pass: deleted the project-local editor/skill config copies
(all available globally) and a design-tool sidecar file, now gitignored — the
live reference to it in `design-systems.md` was dropped.

Folded three open items out of personal memory and into
`wiki/open-questions.md`, each re-verified against the repo today: `llama3.2:1b`
is still configured and still too small for compose, `OLLAMA_API_KEY` is still
absent so the cloud path is still unexercised, and both browser/core mirror
pairs (`resolveStyleBrowser`, `ui/src/lib/types.ts`) still exist unguarded.

Root `CLAUDE.md` and `README.md` updated to point at `corpus/`.

## [2026-08-27] decision | pivot: drop the LLM, become a compiler for a human-written document

Grilling session on `decisions.md` + `open-questions.md`. The product direction
changed: Newspapper no longer calls a language model. Composition moves outside
the app; the app parses a documented text format, previews it, lets a human edit
it, and renders. Recorded as **No LLM in the product**, superseding
"Ollama is the only LLM backend" (2026-05-12). Ollama Cloud support is dropped
rather than finished.

Also settled this round:
- **The human is in the loop by design** — reverses the old "no human-in-the-loop"
  entry, which contradicted the shipped product (the pipeline is documented as
  `scrape → compose → edit → render`, and brief 32 built a full slide editor).
  The real distinction was vocabulary: *editing* vs *approval gate*, now both in
  `wiki/glossary.md`. Approval gates remain rejected.
- **The builder preview is strict, and says so** — unknown theme tokens surface
  as a visible warning. Closes a live gap: `resolveStyleBrowser` silently fell
  back to the literal while core's `resolveStyle` throws, so the builder could
  preview a template the renderer would refuse.
- **The UI keeps its own copy of the shared types** — the copy is justified
  (core ships raw `.ts`; the types fight the Astro build) and has not drifted in
  2.5 months. A guard test replaces trust.

Corrections from verifying the reconstructed rationales against the repo:
- Pinned versions: the recorded reason is **reproducible installs**, not the
  render-path sensitivity I had inferred. Entry rewritten.
- `data/newspapper.db.bak` was never a v1 backup — `user_version: 2`, zero
  articles, zero posts. Deleted, with its orphaned `-shm`/`-wal` sidecars.
- The Ollama Cloud path was unit-tested on both header branches; it was
  unexercised, not untested. Moot now.

`wiki/glossary.md` created (first terms settled). `wiki/open-questions.md`
rewritten around the pivot; the input contract's shape is now the decisive
unknown.

## [2026-08-27] decision | the Wizard pivot — a markup language and a visual editor replace the pipeline

Second half of the grilling session. The product is now a **document compiler**:
a person writes a post in **Newspapper Wizard** (`.wzd`), a JSX-flavoured markup
with `<head>` metadata and `<body>` slides, edited in a split-screen editor
(source · live preview · inspector + component palette) where visual edits are
written back through a formatter.

Settled this round, all recorded in `wiki/decisions.md` with a full spec in the
new `wiki/markup.md`:

- **Semantic components with token-only props**, no raw CSS — the format has to
  make ugly hard, since unattractive output is why the LLM went.
- **Flow layout with stacks**, never absolute positioning.
- **`TNode` becomes the compile target**, not an authoring surface: the
  interpreter, theme tokens, and Chromium renderer all survive.
- **The template system is deleted** — `TemplateDoc`, the nine template JSONs,
  the registry, and `/builder`. Its canvas/inspector machinery becomes the post
  editor. Supersedes the 2026-06-10 templates-as-JSON decision.
- **Markup is the source of truth**; `<head>` owns all post metadata and SQLite
  columns are derived from it.
- **Canonical formatter + linter**, JSX-style; author formatting is not
  preserved across visual edits.
- **Three themes** (`warm-industrial-1/-2/-3`) varying by primary color.
- **Sharp is un-banned**, for image processing only — reverses a v2-era
  constraint that existed because there were no images.
- **Output is JPEG**, not PNG.
- **Publishing is a manual state** meaning "ready to post", and runs image
  optimization.
- **Build the editor rather than adopt Puck**, borrowing its `{type, props}`
  data model with children inline in a slot prop.
- **Access is behind a single account** — reverses the no-auth assumption in
  `PRODUCT.md`.

`decisions.md` outgrew the 200-line cap mid-session and was split into
product and `decisions-engineering.md`; `wiki/markup.md` and `wiki/glossary.md`
were added; `soul.md` left the corpus to become a gitignored local skill
(`.claude/skills/newspapper-voice/`).

Not yet done: `CLAUDE.md` still carries the pre-pivot constraints (including the
now-wrong Sharp ban), `PRODUCT.md`/`DESIGN.md` are still at the repo root, and
no briefs have been written.

## [2026-08-27] todo | thirteen briefs filed for the Wizard rebuild

Briefs 51–63 written to `briefs/todo/`, in four dependency waves: strip the AI
surface and land the new schema; then the language (parser/formatter/linter),
the component library, auth and uploads; then JPEG output and the template
teardown; then the editor, the article library, themes and the page map; and
finally the documentation pass.

The catalog with its dependency graph lives in `wiki/status.md`. Two ordering
constraints are called out explicitly in the briefs themselves: 58 (retire
templates) must not start before 54 (component library) lands, or the app has
nothing that renders; and 63 (docs) runs last.

Also this pass: the language is spelled **Wizard**; every reference to a
deployment target was removed from the corpus at the owner's request, and the
routing page was rewritten to describe practices rather than name tooling.

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

## [2026-08-27] decision | direction round opened for the workstation redesign; anime.js locked as the motion engine

The pivot retires the app chrome along with the pipeline it described: the
four-step stepper, the wizard shell, and the builder toolbar are the signature
components of a product that no longer exists. Recorded as a product decision
(*The workstation is redesigned; the slide theme is not*) — the `warm-industrial`
tokens that paint the 1080² output are a separate system and carry over untouched.

Four replacement worlds were derived and drawn as complete editor screens, then
put to the owner: **The Specimen** (a foundry specimen sheet made operable —
leads), **The Cutting Bench** (a film editor's bench; beat the lead on both
audience identification and product clarity), **Struck Cathode** (a nixie stack
behind bronze gauze; held one axis), and **The Mechanical** (the paste-up board;
the top-ranked grounded candidate, carrying a familiarity risk). Four further
candidates were declined, each donating one discipline to the lead: the compile
dramatised as an event, a rigid repeated label block per post, integer-only
preview scaling, and selection drawn as a lit connection between source and
canvas rather than two independent highlights.

Nothing is chosen yet, so `DESIGN.md` was **not** rewritten — it carries a status
block marking it superseded in intent but accurate for what `ui/` renders today.
`PRODUCT.md` was rewritten in full: it had drifted badly, still describing the
four-step wizard, PNG output, no auth, and an LLM writing the copy. Its brand
personality section is deliberately left open pending the round.

Settled independently of the round and recorded as an engineering decision:
**`animejs` 4.5.0** (MIT, no dependencies, framework-agnostic ESM) is the motion
engine. **motion-primitives** and **smoothui** were rejected — both are
shadcn-style React kits requiring Tailwind CSS (v4 for smoothui) plus Motion, and
this UI is Astro islands + CSS Modules + Base UI with no Tailwind. They remain
pattern references. Standing rules: one authored motion moment per surface,
everything behind `prefers-reduced-motion`, and no motion inside the slide canvas.

Filed `todos/workstation-redesign.md` for the chrome rebuild, which runs against
brief 59 rather than before it.

Still not done, unchanged from the last entry: root `CLAUDE.md` carries the
pre-pivot constraints (Ollama-only, the Sharp ban, one-post-per-day), and
`PRODUCT.md`/`DESIGN.md` remain at the repo root rather than in the corpus.

## [2026-08-27] decision | The Mechanical pinned; three alternates re-rolled under a "more structure" steer

The owner picked **The Mechanical** — the paste-up board — from the first round
and asked for the other three to be reloaded with more structure. A pin beats
the roll, so it leads and is no longer up for re-decision; what remains is
confirm-or-swap.

The Mechanical came back **raised by five donations** from the declined hand,
each written into the direction rather than left as a note: findings pin to
their node on a leader line and carry the actual measurement; one universal
diagonal means "held out" on every surface; every slide renders at one fixed
scale on a shared baseline, with a registered overlay to compare two; selection
is physical promotion rather than a highlight; and one grid governs everything.
A **second surface** was drawn — the post library as a flat file of boards,
where drafts keep their tissue corner, published boards carry the stamp, and a
board that won't compile wears the same rubylith the editor uses.

Three replacements were dealt, all in the same physical-production family and
each enforcing structure through a different mechanism: **The Forme**
(letterpress lock-up — nothing floats, empty space is visible wooden furniture,
lock-up *is* publish), **The Wire Desk** (teleprinter fanfold — structure by
fixed character pitch, two ribbon colours with red reserved for errors, and the
only world that already knows what to do with the RSS side), and **Page 101**
(broadcast teletext — every glyph on one lattice, three-digit page addresses as
navigation, a fastext action bar). A hybrid was also put on the table: keep the
board, adopt the furniture rule as its layout law.

Declined this round — tensegrity column, industrial quote grammar, botanical
folio, console void, live ASCII render — with each one's discipline extracted
before it left; those are the five raises above.

One finding worth carrying whatever wins: **teletext's eight colours give five
usable text colours on black, not eight.** Blue fails contrast outright; green
and red are only safe at weight. Any state system built on that palette is a
five-slot system.

Corpus updated: `wiki/open-questions.md` now frames the question as
confirm-or-swap and carries the alternates and the raises; `wiki/status.md`
records the pin; `todos/workstation-redesign.md` lists the five layout rules
that ship with The Mechanical if it stands. `DESIGN.md` and `PRODUCT.md`'s
brand section still wait on the confirmation, by design.

## [2026-08-27] decision | The Mechanical chosen; DESIGN.md rewritten, brief 64 filed

The owner confirmed **The Mechanical** — the paste-up board — as the
workstation's visual world. The round is closed.

`DESIGN.md` was rewritten in full, derived from the approved comps rather than
from intentions: every colour, shadow and type value in it was measured off a
rendered screen. The system in one line — a 26px non-photo blue grid under
everything, the slide inside crop marks and register targets, the markup waxed
on as a galley, the inspector on a tissue overlay that hinges off the canvas.

Four things in it are load-bearing and easy to undo by accident, so each is
written as a named rule: `border-radius` is **0** throughout; the blue grid may
carry alignment and never information (**The Non-Photo Rule**); state is a
**mark** — rubylith, wax, stamp, tissue corner, hatch — with one mark per idea
and never a second treatment elsewhere (**The One Mark Rule**); and the chrome
face is **Archivo**, with **Inter confined to the rendered slide**, because that
separation is what keeps the artwork legible as a made thing.

One correction fell out of measuring the build: `#7a7a76` reads 4.0:1 on board
and therefore cannot carry text. `#6d6a62` is now the ink floor, and `#7a7a76`
is demoted to rules and ticks.

`PRODUCT.md`'s brand personality section — deliberately left open when the file
was rewritten earlier today — is filled in: *flat, marked, square*. An
anti-reference was added for the failure mode this world is most exposed to: the
board wearing a costume, where a rounded corner or a coloured status pill turns
it into a generic dashboard with production marks sprinkled on top.

`todos/workstation-redesign.md` is promoted to **brief 64**, which owns the
tokens, the shared primitives, the tray, the mark set, the two fonts, and
`animejs`. It runs *after* briefs 59 and 62 — the editor's structure is what the
world has to clothe, and styling a layout that is about to change wastes the
work. Its acceptance criteria include one that matters more than the rest: a
re-render of an existing post must be byte-identical, because
`assets/design-systems/` is out of scope and the 1080² output does not change.

The open question "which visual world does the workstation move to" is deleted
from `wiki/open-questions.md`; the remaining themes question now says explicitly
that it concerns the *slide* family, not the chrome.

## [2026-08-27] done | brief 51 — the AI surface is gone

Wave 1 of the Wizard rebuild. `core/src/compose/**`, the Ollama client, the
`/prompt` page and `data/prompt.md`, slide-level AI, and generated captions are
deleted. `Settings` is now `{ defaultTheme: string }`.

Gates verified from the controller against the integrated tree: build passes,
**142 tests pass** (down from 179 — every removed test covered deleted code, and
the two Ollama-masking tests were replaced with `defaultTheme` round-trips
rather than dropped), lint clean, `grep -ri ollama` over `core/src api/src
ui/src` returns nothing.

The executed wave order differs from the one originally filed. Dependencies
alone were not enough: several briefs collide on files the DAG does not show —
`core/src/types.ts` (51, 52), `core/src/index.ts` (51, 53, 58), `.env.example`
(55, 56), the nav/sidebar (58, 62, 64), and `ui/src/components/editor/` (56, 59).
The order is now `51 → 52‖53 → 54‖55‖56‖60 → 57‖58‖61 → 59 → 62 → 64 → 63`, and
two lanes were assigned to keep parallel waves disjoint: **55 owns
`.env.example`** and 56 reports its vars for the controller to add; **56 stays
core+api only** and 59 builds the image picker.

One deliberate deferral: `EditPanel.tsx` still calls the deleted
`POST /api/slide-ai`. It was on 51's must-NOT-touch list, and removing the calls
properly means deciding what cross-family variant switching does without an AI
remap — a design question. Brief 59 rebuilds that directory wholesale and owns
the answer.

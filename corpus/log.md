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

## [2026-08-27] done | briefs 52 + 53 — the schema and the language

Wave 2, run in parallel. Gates verified from the controller against the
integrated tree: build passes, **361 tests pass** (up from 142), lint clean.

**52** landed schema v3 — `users`, markup-backed `posts` with a CHECK-constrained
`draft`/`published` status, `keywords`/`post_keywords`, `renders`, `uploads`, and
reworked `sources`/`articles`. The migration **drops every v2 `posts` and
`articles` row on purpose**: a v2 post held a composed payload with no markup to
derive it from, and v3 persists only the articles you save. `settings` survives.

**53** landed the Wizard language with no new dependency: a hand-written
recursive-descent parser, a canonical formatter, eleven lint rules, a data-shaped
component catalogue, and 170 tests. Two properties were built in for downstream
work — every AST node carries a source range verified against its own source
slice, and the catalogue is data rather than code, so brief 59's bidirectional
selection and its inspector both have something real to read.

`wiki/markup.md` was rewritten to match what shipped. The substantive change: the
page said props take "a value from a named scale or a short enum", which cannot
express `<Image src="...">`. The catalogue now separates **scale props**
(`size`/`align`/`emphasis` — still the only enums) from **content props**
(`Image.src` required, `Image.alt`, `Quote.by`, `Stat.label`). The invariant that
matters is unchanged and now asserted by a test: no prop ever carries a style
value, and there is no `style` or `class` anywhere.

## [2026-08-27] incident | npm test was destroying the developer's database

Found while integrating wave 2, and older than the rebuild. `api/src/server.test.ts`
has always set `NEWSPAPPER_DB_PATH` to a temp directory, and `defaultDbPath()` in
`core/src/storage/db.ts` never read it — it resolved from `import.meta.url`
unconditionally. So every `npm test` run opened and migrated the real
`data/newspapper.db`, while the test file's own header comment claimed "the DB is
ephemeral (in-memory via temp path)".

Harmless for as long as migrations were additive. Brief 52's v2→v3 migration drops
`posts` and `articles`, so the first test run after it landed destroyed the dev
database's contents — 1 post and 33 articles. `data/` is gitignored, so nothing
was lost from the repo, and `settings` and `sources` re-seeded correctly.

Fixed: `getDb()` resolves `NEWSPAPPER_DB_PATH` first and falls back to the repo
path only when it is unset, with a regression test asserting the override is
honoured. Recorded in `wiki/decisions-engineering.md`.

The lesson generalises past this bug: **a harness that sets an environment
variable is not evidence that anything reads it.**

## [2026-08-27] lint | the ui/lib/types guard test never existed

`wiki/decisions-engineering.md` claimed "a guard test keeps it that way rather
than trust" of the hand-maintained `ui/src/lib/types.ts` mirror of
`core/src/types.ts`. Grepping for it returns nothing. The copy held for 2.5 months
on discipline alone; brief 52 then changed `Article` and added seven interfaces,
and the mirror drifted silently. The entry is corrected, and brief 58 — which owns
that file — has to both re-sync it and write the test the corpus has been claiming
for months.

## [2026-08-27] done | wave 3 — briefs 54, 55, 56, 60 in parallel

Gates verified from the controller against the integrated tree: build passes,
**546 tests pass** (up from 361), lint clean, and every new source directory
confirmed tracked rather than gitignored.

**54** compiled the language to `TNode`. Two compile paths, deliberately: the
strict one lints and throws for the render pipeline, the forgiving one degrades
in place for the live preview, because a document is broken most of the time
while you are typing it. The compile is browser-safe, which is what makes brief
59's "no second copy of style resolution" achievable rather than aspirational.

**55** landed auth. Two questions `open-questions.md` had left open are now
answered, and both went against the brief's own suggestion for good reasons —
see `decisions-engineering.md`. It also found `/output/*` serving rendered
slides to anyone who asked, and put them behind the guard.

**56** landed uploads. The security work is in the brief's outcome note; the
transferable lesson is the `.gitignore` one. `uploads/` unanchored also matches
`core/src/uploads/`, so the entire new module would have gone invisible to git
while building and testing green — and shipped as "done" until someone cloned
the repo. Anchoring it to `/uploads/` fixes it, and the wave gate's
tracked-not-just-on-disk check is what catches this class of thing.

**60** turned `scrape()` into `searchArticles()` and stopped persisting scrape
output, which let all six of brief 52's deprecated article shims be deleted.
`/sources` is gone, folded into `/articles`.

Two controller-lane integrations, because parallel briefs could not both edit
the files: the uploads route registration into `api/src/server.ts`, and
`UPLOADS_DIR`/`UPLOADS_BASE_URL` into `.env.example`.

One deviation worth recording: brief 60's "start a post from this article" step
was withdrawn at dispatch rather than implemented. It is genuinely undecided and
the editor brief owns it; `open-questions.md` records that the API already
carries what it would need.

## [2026-08-27] done | wave 4 — briefs 57, 58, 61

Gates verified from the controller: build passes, **526 tests pass**, lint and
corpus lint clean, `grep -rw TemplateDoc` returns nothing, the render path is
JPEG-only, and the new guard test genuinely executes.

**57** moved rendering to JPEG and added the publish optimization pass. It also
closed a security gap nobody had filed: `<Image src>` was resolved to a URL for
Chromium without checking that it *was* an upload ref, so a smuggled `http://`
or `file://` would have had the render browser fetch it. `resolve-images.ts` now
drops anything that is not a valid ref, at the render boundary as well as in the
resolver. Quality 85 was chosen by looking at zoomed crops of real type, not by
comparing file sizes.

**58** retired the template system. Two deletions beyond the brief, both forced
and both right: `api/src/routes/preview.ts` had nothing left to do once the
compile became browser-safe, and `GET /api/themes` had to be extracted to its
own route first because it was never part of the registry.

The `ui/src/lib/types.ts` guard test the corpus had claimed for months now
exists, built on the TypeScript compiler API so it diffs exported *shapes*
rather than text. Building it turned up a second silent failure: `ui/**/*.test.ts`
was not in `vitest.config.ts`'s include list, so the test would have existed and
never run. Same family as the `.gitignore` incident — green because nothing
executed.

**61** shipped the two sibling palettes and enlarged the type ramp for the 1080²
canvas, with contrast measured rather than asserted. It correctly refused two
items and they are now brief 65.

## [2026-08-27] todo | brief 65 filed — the theme family is not finished

Two things brief 61 could not reach from inside `assets/design-systems/**`.

**The `size` prop is currently a lie for `Heading` and `Stat`.**
`WZD_TYPOGRAPHY_SCALES` maps component + size to a *token name*, and it maps
`Heading` `lg` and `xl` to the same `display` token. So a person writes
`size="xl"`, the linter accepts it, and the slide does not change — no theme ramp
can fix that. The controller routed brief 54's finding to 61 on the assumption it
was a theme gap; it is half a theme gap and half a code one.

**The rename never happened**, so the repo ships four themes where
`decisions.md` says three. `warm-industrial` → `warm-industrial-1` touches ~15
hardcoded call sites, the `posts.theme` column default, and existing rows — a
data migration, which a junior-scoped brief was right to refuse rather than
improvise.

Brief 65 also picks up the every-theme `missingThemeTokens` acceptance test that
61 verified by script but could not commit, since it belongs in `core/src/**`.
It runs in wave 5 beside the editor; their file sets are disjoint.

## [2026-08-27] resume | paused mid-wave-5; resume point written

Paused at the user's request. Nine of fifteen briefs are done on
`wizard-rebuild` at `fd96b9f`, whose gates were re-run in the same turn this was
written: build passes, 526/526 tests, lint clean, corpus lint clean.

Briefs 59 and 65 were **in flight** when the pause came, which is the one state
the wave gate is designed to avoid. Brief 59 had already deleted the pre-pivot
editor without landing its replacement, so the working tree did not build, and
neither agent had produced a Handoff report — without those there is no record
of what either intended.

Rather than leave that for a fresh session, both agents were stopped, the partial
diff was committed to a dead-end branch `wave5-partial-abandoned` (`11d78f8`, 30
files, +688 −1891) so nothing is destroyed, and `wizard-rebuild` was returned to
`fd96b9f`. **59 and 65 get re-dispatched from their briefs, not resumed.**

The resume document is [`resume-2026-08-27.md`](resume-2026-08-27.md), linked
from `index.md` and `wiki/status.md`. It carries the wave plan and why it differs
from the filed one, the file-ownership collisions and the two lanes assigned
around them, the ruling ledger, the two live defects (both filed as brief 65),
and the three "green because nothing ran" incidents this run turned up.

## [2026-08-31] done | wave 5 — briefs 59 and 65, after the pause

Re-dispatched from a clean tree rather than resumed; the abandoned partial work
from before the pause was not salvaged. Gates verified from the controller:
build passes, **619 tests pass** (up from 526), lint and corpus lint clean.

**59** landed the editor. The preview needed no server route — it runs in the
browser off the same compile the renderer uses, via a new `"./wizard"`
browser-safe subpath. The guarantee is mechanical rather than promised: a test
asserts the preview's tree equals core's `compile()` output across every sample
fixture, so the two cannot drift apart silently. Selection is a **path**, not an
offset, because a reformat moves every offset. `api/src/routes/posts.ts` was
rewritten from the dead v2 payload contract to schema v3 — it had been calling a
stub that throws.

**65** fixed the `size="xl"` no-op at both ends and landed schema v4 for the
theme rename. The migration rebuilds `posts` to change its column default, which
meant discovering that with foreign keys on, `DROP TABLE posts` cascades and
takes `post_keywords` and `renders` with it. That was probed against a real
SQLite file before the migration was written, and FKs are dropped and restored
in a `finally`.

The type ramp was extended **upward rather than re-centred**, so `md` — the
default every existing post uses — is unchanged. A re-centred ramp would have
silently reflowed every slide already written.

## [2026-08-31] decision | use-gesture handles pointer interaction

Adopted mid-flight at the owner's request while brief 59 was running, which
replaced a half-built HTML5 drag-and-drop before it spread. `@use-gesture/react`
10.3.1, MIT, one dependency.

It passes the test motion-primitives and smoothui failed, for the same reason
those were rejected: it ships no styles, no components and no rendering
opinions, so it brings no second styling system. A library that only reads input
is cheaper than a component kit. It does not overlap anime.js — one turns
pointer events into deltas, the other turns values into motion over time.

Recorded in `wiki/decisions-engineering.md`. The constraint it does not relax:
drops are still slots between existing children, never free positions.

## [2026-08-31] todo | brief 66 — the rendered slide is in the wrong typeface

Found by brief 59 while verifying end to end. **Every rendered JPEG comes out in
a serif fallback while the preview of the same document shows Inter.** The
tokens are right, the font serves 200 with its full bytes, and the preview is
correct — so the compile, the tokens and the static serving are all fine.
Headless Chromium is screenshotting before the injected `@font-face` resolves.

This is a shipping-quality defect rather than a polish item: the product is one
square image and it is currently being published in the wrong face. Brief 59
could not fix it — `core/src/render/**` was outside its ownership.

## [2026-08-31] incident | the UI workspace was never typechecked

Brief 59 left a dangling import in `ui/src/components/wizard/Wizard.tsx` and
reported it rather than fixing someone else's file. Chasing it down showed the
import was not the interesting part — **no gate in this repo would have caught
it.**

`core` and `api` build with `tsc --noEmit`. `ui` built with `astro build` alone,
which bundles from page entry points and tree-shakes; nothing imports `Wizard`,
so the file was never reached. Running `tsc -p ui` by hand caught nothing either,
because `ui/tsconfig.json` set the deprecated `baseUrl` and that config-level
error aborted the run before a single file was checked.

Fixed the tsconfig (dropped `baseUrl`, added `types: ["node"]` so the eight UI
test files importing `node:fs`/`node:url` resolve), which took the error count
from 9 to 1 — the remaining one being the dangling import itself. Added a
`typecheck` script to `ui`. **Brief 62 deletes the wizard directory and wires
`typecheck` into the root build chain**, since wiring it before that deletion
would put the build red.

Third instance of the same failure this run, after the `.gitignore` pattern that
would have hidden a whole module and the vitest `include` that would have kept
the new guard test from ever executing. The pattern is worth naming: **green
because nothing ran.** A passing command is not evidence of coverage, and the
cheap check is to ask what the tool actually reached.

## [2026-08-31] brief | 62 lands: the page map, the posts API, and `/api/renders`

Wave 6 done. The four-step wizard is gone from the UI entirely — `wizard/`,
`history/` and `export/` deleted, `/history` left as a redirect to `/posts` for
one release. The page map is now `/` · `/posts` · `/articles` · `/settings` ·
`/login`. Posts gained create, a status flip, and list filters; `GET
/api/renders` is new so `/posts` can draw a thumbnail per row in one request
rather than N.

Two things worth keeping. **An unknown theme is now rejected at save time** on
both `PUT /api/settings` and the post write paths — it used to be stored
happily and then thrown on by `loadTheme` at the next render, so a bad save
surfaced two steps later, on a different screen, as a render error. And
`/api/renders` **reads the run directory rather than reconstructing filenames
from `slideCount`**, because a pre-brief-57 run holds `1.png` and a cleaned-out
run holds nothing: the library has to show what is on disk, not what the row
claims.

Gate: build, **630 tests**, lint, `tsc -p ui` at 0 errors, corpus lint.

## [2026-08-31] corpus | api.md rewritten from the routers; the deferred pages caught up

`api.md`'s Posts section had been describing the dead v2 `{ payload }` contract,
and Renders, Publish and the JPEG output path were undocumented. Rewritten by
reading `api/src/routes/*.ts`, not from memory — which is what brief 62's
acceptance asked for and is the only way this page stays true.

Also folded in the two updates brief 59 deferred: `modules.md` now documents the
`@newspapper/core/wizard` subpath (and why there are two compile paths), and
`dependencies.md` carries `@use-gesture/react@10.3.1` with the reason it
replaced HTML5 drag-and-drop. `dependencies.md`'s UI rows still named the
wizard, builder, history and prompt islands, all of which have been deleted.

A note on provenance: the implementing agent's handoff was lost with the
session's task registry, so brief 62's outcome note is reconstructed by the
controller from the diff and the routers. The note says so at the top.

## [2026-08-31] brief | 66 fixes the render typeface — the cause was CORS, not a race

Every rendered JPEG was coming out in a serif fallback while the preview of the
same document showed Inter. The brief guessed a timing race — Chromium
screenshotting before `@font-face` resolved — and that guess was wrong.

`page.setContent` leaves the render document on an **opaque origin**, so the
font fetch goes out with `Origin: null`. Font fetches are always CORS-mode, the
API's allowlist is the two UI origins, and so the bytes arrived complete (200,
407 kB) with no `Access-Control-Allow-Origin` and Chromium threw them away.
That is why the font looked served and the bug looked like a render bug. The
tell nobody had looked at: `FontFace.status === 'error'`, with
`document.fonts.status` *already* `'loaded'` — an errored face is a settled
face, so `fonts.ready` resolves immediately and waiting on it changes nothing.
Measured: byte-identical output with and without the wait.

The fix serves the fonts from disk via route interception. `data:` URIs were
rejected — six weights injected per slide, ~547 kB each as base64, ~3.3 MB for
a document that uses two or three faces. Cost of the fix: +26 ms per slide.

Worth generalising: **an assumption inherited from the bug report is still an
assumption.** The brief stated the hypothesis as near-settled and it survived
into the dispatch prompt unchallenged. What broke it was insisting on a failing
test first — reproducing the defect surfaced the console CORS error that no
amount of reasoning about the render lifecycle would have produced.

## [2026-08-31] corpus | decisions split; the wizard module surface moves to markup.md

Two pages hit the 200-line cap in one session, which is the signal to split
rather than to shave prose.

`decisions-engineering.md` gave up its four security entries — lockout, password
rotation, and what is guarded versus deliberately public — to a new
`decisions-security.md`. They cohere on their own and share one premise worth
stating at the top of that page: the app runs on loopback for one person, and
that assumption is the first thing to revisit if it is ever exposed.

`modules.md` handed the wizard module surface to `markup.md`, which already
documents the language it serves, and kept a pointer. Someone asking what
`@newspapper/core/wizard` exports and someone asking what `.wzd` is were being
sent to two different pages.

Also filed **brief 67** from a brief-66 finding: the slide's typography tokens
carry a bare `"fontFamily": "Inter"`, emitted inline where it outranks the
interpreter's body stack — so a font failure lands on serif rather than the
intended sans. Latent, but it is why brief 66's defect looked like a render bug.

## [2026-08-31] brief | 64 lands: the chrome is The Mechanical

The app no longer wears v3's design system. `global.css` replaced wholesale,
every shared primitive rebuilt square, `Badge`/`Stepper`/`Spinner` deleted, and
the sidebar rebuilt as the tray. Verified: zero `--radius*` tokens and zero
non-zero `border-radius` in `ui/`; Inter appears only inside `.canvas`; `core/`,
`api/` and `assets/` are byte-identical, so the 1080² output is unchanged.

The part worth keeping is that **five values from the approved comps did not
survive contrast measurement**, and were corrected in the build rather than
shipped. Chiefly: rubylith `#e8452e` cannot carry a word — 3.81:1 on board,
and the comps' own stamp ink was 3.09:1. A darker `--rubylith-ink #c0331f`
(5.43:1) is now the only rubylith that may be a letter, with the film kept for
washes and borders where the 3:1 non-text floor applies. The comps also claimed
`graphite-tint` was 4.0:1; it measures 4.16:1. **An approved comp is a design
decision, not a measurement**, and the difference only shows up if someone
measures.

`prefers-reduced-motion` could not be emulated in the browser session, so it is
guarded by a test that stubs `matchMedia` and asserts the reduced path calls
`utils.set` with the **end** state and never calls `animate`. Stated plainly in
the outcome note: the 26px grid was measured at 1280px only; the ≤768px branch
is written in grid multiples but unmeasured.

## [2026-08-31] finding | `npm run fmt` rewrote 106 files — a fifth "green because nothing ran"

Found by running it on a working tree during brief 64's gate, expecting a no-op.

There is **no Prettier config anywhere in the repo** — no `.prettierrc`, no
`prettier` key. So the documented `npm run fmt` formats with Prettier's
defaults, which means double quotes, against a codebase written entirely in
single quotes. It also exits 2, because its glob names `.astro` files and no
`prettier-plugin-astro` is installed. And `npm run lint` covers only `core/src`
and `api/src` — the `ui` workspace, now the largest surface in the repo, is
never linted at all.

The blast radius was instructive. Reverting `core/` and `api/` was clean, but
`ui/` held brief 64's uncommitted work, so the noise could not simply be checked
out. Recovery used Prettier as an oracle: for each changed file, format the
committed version and compare to the working one — equal means the only change
was mine, so revert it. That cleanly separated 31 noise files from 23 real ones.

It also surfaced a booby trap: `ui/src/lib/types.test.ts` compares the **source
text** of each mirrored declaration against `core/src/types.ts`, so it is
formatting-sensitive and fails the moment one side is reformatted and the other
is not. That is how the whole thing was noticed. Filed as **brief 68**, with the
question of whether that test should compare shape rather than text.

Filed **brief 69** for two loose ends brief 64 correctly declined to fix: the
orphaned 616-line `SourcesIsland` (no `/sources` page since brief 60; it is a
tab of `/articles` now), and `kitchen-sink.astro`, which is unlinked but ships
to `dist/` as a public route.

## [2026-08-31] corpus | chrome.md split from design-systems.md

`design-systems.md` sat at 199 body lines against a 200 cap and described two
systems that share nothing on purpose. The Mechanical moved to its own
`chrome.md`; `design-systems.md` keeps the slide themes and the compile target,
with a pointer across. Third page split this session, after
`decisions-security.md` and the wizard surface moving to `markup.md`.

## [2026-08-31] brief | 67 + 69: the font fallback stack, and two loose ends in `ui/`

**67** put the slide's fallback in the interpreter rather than the theme tokens.
The deciding argument: the criterion is "correct for any theme on disk,
including one added later", and that is a property of the emitter, not of the
files — in the token it would depend on every future theme author remembering,
and the guard could only report the omission after the fact. The objection that
a token should be the literal CSS value does not survive contact with
`resolveStyle`, which already kebab-cases keys, dereferences `$color.primary`,
and appends `px`. Themes opt out by authoring their own generic.

The 1080² output was proved unchanged rather than argued: 48 slides hashed
before and after, **0 differing — with 48 of 48 HTML documents differing.** The
second number is what makes the first mean anything.

**69** moved `SourcesIsland` into `articles/` as `SourcesPanel` with a real CSS
module, and gated the kitchen sink to dev instead of shipping or deleting it.
The gating reason is the good one: it is the only page that renders with **no
session at all**, because it calls no API and so never triggers the 401 redirect
— measured, not assumed. Fine on loopback, but that is an argument with a known
expiry date. The move also turned up a nested `ToastProvider` mounting a second
viewport inside the first (invisible, since both sat at the same position) and
90 lines of dead code nothing rendered.

Equivalence was measured, not eyeballed: 10,051 computed properties across 19
elements, zero differences, plus a byte-identical kitchen sink.

One regression from brief 64 was caught by that measurement and fixed inline:
`.tab:hover` at (0,1,1) out-ranked `.tabActive` at (0,1,0), so hovering the
active tab painted graphite on graphite — 1:1, the label gone.

## [2026-08-31] finding | a guard that rests on a quoting convention — the sixth of the kind

Brief 67's first cut emitted `'Inter',sans-serif` — quoted, to match the body
rule — and brief 66's typeface guard failed.

The cause is worth the entry. `fonts.test.ts` builds its no-Inter control with
`html.replace(/'Inter'/g, …)`, which works **only because the inline styles are
unquoted**: the rename hits the `@font-face` rule alone and leaves the text
asking for a family nothing defines. Quote the inline family and the rename
takes it too, so the text asks for the renamed face, the `@font-face` still
loads it from the real TTF via brief 66's disk route, and control and subject
become the same document. The test's own comment claims it renames the family
everywhere; it does not, and it works *because* it does not.

It failed closed, which was luck. A guard whose control can silently collapse
into its subject is the same shape as every **green because nothing ran** entry
above — six now. The lesson is narrower than "test your tests": **a control
should be structurally incapable of the thing it controls for**, not incapable
by side effect of a regex. Filed as brief 71, with the unescaped `styleToString`
interpolation brief 67 also found.

For now `withFallbackFamily` passes authored families through verbatim and
appends only the tail, and the reason is in its doc comment — where the next
person reaching for quoting will find it before the test does.

## [2026-08-31] decision | Astro is being replaced by Vite + React (brief 70)

Requested by the owner. The assessment that justified filing it: all 360 lines
of `.astro` are shell, five of six pages are 8-line files mounting one island,
**every island is `client:load`** so there is no partial hydration to lose, and
the app is entirely behind auth with no SEO surface. Astro's reasons to exist
are all unused here.

The two genuinely Astro-shaped things — `ClientRouter` and the tray's
`transition:persist` — exist to keep the sidebar mounted across navigation, and
in an SPA the tray simply never unmounts. They disappear rather than needing
replacements. `api/src/server.ts` already falls back to `index.html` for non-API
GETs, so deep links are already served.

Ordered after **68** so the migration's new code is the first `ui/` code this
repo has ever actually linted, and before **63**, since documenting Astro
immediately before removing it would waste the pass.

## [2026-08-31] finding | `npm run lint` had never linted anything — the seventh, and the worst

Brief 68 was filed to fix three things in `package.json`. It found a fourth in
`eslint.config.js`: the file registered the TypeScript parser and plugin, then
set `no-unused-vars`, `@typescript-eslint/no-unused-vars` and `no-undef` all to
`'off'` and imported no recommended config. **Zero rules were enabled.**
`npm run lint` has reported green for this project's entire history while
checking nothing.

Verified rather than accepted: a file containing a plain unused variable draws
**exit 0 and no output** from the old config, and an error from the new one.

This is the seventh *green because nothing ran*, and it differs from the other
six in kind. Those were tools pointed at the wrong place — a DB path nothing
read, a `.gitignore` pattern, a vitest `include`, a workspace that was bundled
but not typechecked, a `fmt` with no config, a test control that collapsed into
its subject. This one was **configured to do nothing**, which no amount of
pointing it correctly would have fixed.

There was a tell, and it had been sitting in the tree: `SourcePane.tsx:114`
carries an `eslint-disable-next-line react-hooks/exhaustive-deps` for a rule
that did not exist. **A disable comment is evidence that someone expected a rule
to run.** Worth grepping for suppressions of rules a config does not define —
it is a cheap check and it would have caught this.

Only 16 findings appeared once the rules were real, all resolved. Ten React
Compiler findings are suppressed at config level pending brief 72, because every
fix restructures an effect and brief 68 was tooling-only.

## [2026-08-31] brief | 68 + 71: the tooling actually runs, and the guard actually guards

**68** landed `{ singleQuote: true, printWidth: 100 }`, **derived by measuring**
— a search over 12 Prettier options against all 158 committed files, scored by
files already clean. Prettier's defaults, which `npm run fmt` had been using,
scored **1 of 158**. The chosen config scores 88 and sits at the minimum of the
changed-line curve. Picking a house style by preference would have made the diff
a matter of taste; measuring made it a matter of fit.

`npm run build` now runs `fmt:check` first, with the cost stated honestly: an
agent running `build` for type feedback mid-refactor hits a formatting failure
before any type error. Accepted, because a formatter nobody runs is how 106
files drifted.

`.astro` was dropped from the `fmt` glob rather than plugged, since brief 70
deletes every `.astro` file. That requirement — and carrying `fmt:check` forward
through the build-script rewrite — is now written into brief 70, because a
migration that quietly drops either would undo this within days.

**71** rebuilt the typeface guard's control so it is structurally incapable of
loading Inter, and checks that on the *product*: `assertCannotLoadInter` throws
unless the finished document contains no `@font-face` and no occurrence of
`inter` in any case. The agent then demonstrated the guard failing by neutering
the disk route, and ran the quoting experiment — which caught a real defect in
its own first cut, where a delete-based regex ate the inline declaration under a
quoted family. **The pixel guard still passed; only the structural test caught
it.** The same failure one level up, which is exactly why the experiment was
worth doing rather than asserting.

## [2026-08-31] corpus | decisions-tooling.md split out; third split this session

`decisions-engineering.md` hit the 200-line cap for the second time today. The
seam that had formed was between **runtime and library** calls and calls about
**the repo itself** — workspaces and ESM, exact pinning, the enforced formatter,
typechecking the UI. Those four moved to `decisions-tooling.md`, whose preamble
notes that three of them exist because a tool was reporting success while
reaching nothing.

Third split this session, after `decisions-security.md` and `chrome.md`. The
pattern is worth naming: pages hit the cap when a *second subject* has grown
inside them, and shaving prose to fit is how the second subject stays hidden.

## [2026-08-31] finding | the api's upload test had an undeclared dependency — the eighth

`api/src/routes/uploads.test.ts` imports `sharp`. `api/package.json` declared
none. It had been resolving against the hoisted copy **Astro pulled in as an
optional dependency** — so the moment brief 70 removed Astro, the file failed at
import and contributed **zero** tests instead of fourteen.

Two facts, and the second is worse than the first. The api test had an
undeclared dependency; and because it resolved to Astro's copy, it had been
testing image handling against **sharp 0.34.5 while production ran 0.35.4**.
Nothing announced either. Fixed by declaring `"sharp": "0.35.4"` in
`api/package.json` devDependencies, matching `core`.

The general shape: **a dependency that resolves only by hoisting is a test that
passes by coincidence.** Removing an unrelated package is enough to break it,
and the version it silently binds to is whatever the accident supplied.

Also note the failure was *loud* — an import error, not a silent skip — but the
signal still nearly got lost, because it surfaced inside a wave where two agents
were editing concurrently and each reasonably attributed it to the other. It was
resolved by checking `git show HEAD:package-lock.json` rather than by argument.

## [2026-08-31] brief | 70 + 72: Astro is gone, and the hook rules are real

**70** replaced Astro with a Vite + React SPA. The whole `.astro` surface was
360 lines, five of six pages were 8-line shells, and every island was
`client:load` — so nothing Astro offered was in use. Routing is ~95 hand-rolled
lines over `useSyncExternalStore`; React Router and wouter were rejected because
several components already navigate with `window.location.assign` and the editor
writes `?post=` with its own `replaceState`, and a router that owns history
argues with all of that.

The moment worth keeping: the first cut had each page render its own `<App>`,
and **a DOM probe caught the tray remounting on every navigation** — exactly what
`transition:persist` had prevented, silently reintroduced by the migration whose
premise was that it had become unnecessary. The premise was right and the
implementation was not, and only measuring the difference showed it.

**72** turned `set-state-in-effect` and `refs` back on and judged all ten sites:
five fixed, five suppressed at the call site with reasons. The right split — a
blanket rewrite would have been worse than the config blanket it replaced.

It also produced a caveat now recorded next to the rules: **the React Compiler
bails out silently on some components**, proved by planting a blatant violation
that drew no finding while sites in a sibling component in the same file were
still reported. A clean lint run means "nothing found", not "nothing there".

## [2026-08-31] corpus | CLAUDE.md's constraints were describing a product that no longer exists

Found while chasing the `sharp` question. `CLAUDE.md` still said **"Do NOT add
Sharp"** — a rule `decisions.md` had explicitly reversed on 2026-08-27, and which
`core/package.json` had been violating ever since, correctly. It also still
described Ollama as the LLM, the four-step wizard, one theme, PNG output, and
`/builder`.

This matters more than an ordinary stale doc: `CLAUDE.md` is the first file every
session reads, and the controller had been copying that dead Sharp rule into
dispatch prompts all day. Constraints sections rot in the most dangerous
direction — a wrong *prohibition* is obeyed silently and leaves no trace.

Rewritten: no LLM at all, Sharp allowed for images, exact pinning, ESM, and the
enforced `fmt:check`/lint wiring. The Tests section now points at this log's
"green because nothing ran" entries by name, since eight of them is no longer a
curiosity. The remaining stale half — the pipeline diagram, the data table, the
Architecture section — is brief 63's, which runs next.

Also moved the Vite/Astro decision from `decisions.md` to
`decisions-engineering.md`: it is an engineering call, not a product-shaping one,
and `decisions.md` was over the cap with it.

## [2026-08-31] brief | 63 closes the rebuild: the docs describe the shipped product

The last brief of the v4 rebuild. It found that several wiki pages did not merely
lag the code but **asserted things the code contradicts** — `compose` as a core
export and `POST /api/compose` in the pipeline (neither exists), schema v4 with a
migration table stopping at v3, `npm run build` as "typecheck + astro build". In
every case the agent believed the source and rewrote the prose.

The sharpest find: **`loadConfig()` is exported from the core barrel and called
nowhere**, so seven documented environment variables are settable and inert.
`THEME` is live only because `settings.ts` reads it separately. Anyone setting
`OUTPUT_DIR` and expecting a change would have debugged nothing for an hour.
Filed as brief 73 with three siblings — an `infra/docker-compose.yml` defining
only an Ollama service for a product with no LLM, a root `tsconfig.json` pointing
at an untracked `src/`, and an `api` `start` script naming a `dist/` its build
never emits.

`DESIGN.md` split into `design.md` and `design-components.md` with **continuous
section numbering**, because nine source files cite "DESIGN.md §N" in comments.
Renumbering to make each page start at §1 would have silently broken every one.

And it went one directory further than asked: `corpus/CLAUDE.md`'s own
constraints paragraph still said "Ollama only, no Sharp, one post per day" — the
exact harm brief 63 existed to remove, sitting in the file that governs how the
corpus itself is maintained.

## [2026-08-31] corpus | the eight incidents get their own page

`green-because-nothing-ran.md` collects every instance found during the rebuild,
each with what the tool actually reached, how it was caught, and the cheap check
that would have caught it sooner. Linked from `CLAUDE.md`, `README.md`,
`index.md`, `routing.md`, `overview.md`, `status.md`, `commands.md` and
`configuration.md`.

The reason it is a page and not a log thread: `log.md` is append-only history,
and history is where a lesson goes to be forgotten. Someone about to trust a
green command needs to find this in one hop from the entry point, not by reading
a year of entries. The retrieval budget is `index.md` plus two or three pages —
if a lesson cannot be reached inside it, it does not exist.

Worth stating once, plainly, since it is the through-line of this whole rebuild:
**most of the real defects were not in the code. They were in the things that
were supposed to be checking it.** A test harness setting a variable nothing
read; a `.gitignore` pattern that would have hidden a module; a vitest `include`
omitting a workspace; a workspace bundled but never typechecked; a formatter with
no config; a test control that collapsed into its subject; a linter with zero
rules enabled; a test importing a package it never declared. Every one reported
success.

## [2026-08-31] corpus | Sharp stops being a rule; the abandoned wave-5 branch is gone

`CLAUDE.md` framed Sharp as a permission granted against a lifted ban. That was
accurate history and the wrong shape for a constraints list: Sharp is an
ordinary dependency doing an ordinary job, and a rule about it invites the next
reader to treat it as contested. The two "X is allowed" lines collapse into one
statement of what must not be added; Playwright and Sharp are named as what they
are. The reversal itself is still recorded where reasoning belongs, in
[decisions.md](wiki/decisions.md#sharp-is-allowed-for-images-only) and
[dependencies.md](wiki/dependencies.md).

Worth keeping the general form: **a constraints list should say what is
forbidden, not narrate what was once forbidden and no longer is.** The dead
prohibition in that file was copied into five dispatch prompts before anyone
noticed, and a permission phrased as an exception is the same hazard one step
weaker.

Also deleted the `wave5-partial-abandoned` branch (`11d78f8`), kept since
2026-08-27 as a safety copy of the mid-flight work stopped when briefs 59 and 65
were interrupted. Both were re-dispatched from scratch and landed in `f315e01`,
so the branch held nothing that is not superseded. It was never pushed.

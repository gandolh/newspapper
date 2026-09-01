# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## What this is

A local web app for writing an Instagram-style slide post by hand and compiling it to 1080×1080 JPEGs:

```
.wzd document  →  compile  →  HTML  →  Chromium  →  1080² JPEGs  →  publish / ZIP
```

A post is authored in [Newspapper Wizard](corpus/wiki/markup.md) markup in a split-screen editor (source · live canvas · inspector · palette). **No model is involved anywhere.** RSS survives only as a searchable library of source material to write *from*.

UI at `http://localhost:4321`, API at `http://localhost:3001`. No CLI. Single account, loopback only.

## Commands

```bash
npm install                      # one-time (+ npx playwright install chromium)
npm run build                    # fmt:check → tsc core → tsc api → tsc ui → vite build
npm run dev                      # start API (3001) + UI dev server (4321)
npm run dev --workspace=api      # API only
npm test                         # vitest over core/**, api/** and ui/**
npm run lint                     # eslint core/src api/src ui/src ui/vite.config.ts
npm run fmt                      # prettier, same three workspaces + ui/index.html
bash corpus/lint.sh              # corpus health check (add --index to regenerate)

# Single test file
npx vitest run core/src/path/to/file.test.ts
```

Every one of those coverages was, at some point, silently doing nothing — see Tests below.

## Architecture

Three npm workspaces, dependency direction `ui → api → core`:

- **`core/`** (`@newspapper/core`) — the library: the `.wzd` parser/formatter/linter/compiler (browser-safe), the `TNode` interpreter, Playwright rendering, the publish-time JPEG pass, RSS search, Sharp image uploads, SQLite storage, theme loading. Four entry points: `.`, `./templates`, `./publish`, `./wizard`.
- **`api/`** (`@newspapper/api`) — Fastify on 3001: all `/api/*` routes behind a session guard, SSE for the two long ops (search, render), serves `/assets/fonts/`, `/output/`, `/uploads/<ref>` and `ui/dist/` in prod.
- **`ui/`** (`@newspapper/ui`) — a Vite + React SPA with a hand-rolled router: editor (`/`), `/posts`, `/articles`, `/settings`, `/login`. Astro was removed in brief 70.

One structural rule that is load-bearing: every route but `/login` renders inside **one `<App>` element at one position** in `ui/src/routes.tsx`. That is what keeps the sidebar tray mounted across navigation. A route that renders its own `<App>` silently breaks it.

See [corpus/wiki/architecture.md](corpus/wiki/architecture.md) for the full flow and SSE protocol.

## Data

| Path | Contents |
|------|----------|
| `data/newspapper.db` | SQLite (schema v4): `posts`, `keywords`, `post_keywords`, `renders`, `users`, `sources`, `articles`, `uploads`, `settings` |
| `data/sources.json` | v2 residue — a one-time seed for the `sources` table. Nothing reads it afterwards. |
| `assets/design-systems/` | The three slide themes as JSON tokens |
| `assets/fonts/` | Inter TTFs, read off disk by the render browser |
| `ui/public/fonts/` | Archivo + Spline Sans Mono (app chrome), plus Inter for the preview canvas |
| `uploads/` | `originals/` + `normalized/` image store (`UPLOADS_DIR`) |
| `output/YYYY-MM-DD-N/` | Rendered JPEGs + slides.json + caption.txt |

`data/`, `uploads/` and `output/` are gitignored. The DB is auto-created and migrated on boot.

`posts.markup` is the source of truth; title, description and keywords are derived from the document's `<head>` on every write. Full schemas: [corpus/wiki/data.md](corpus/wiki/data.md).

## Theme

**Two design systems, and they share nothing on purpose.**

The **slide themes** paint the 1080² artwork: `warm-industrial-1`, `-2`, `-3` — a family, not three designs, differing only in the primary colour. Tokens in `assets/design-systems/`. Inter lives in `assets/fonts/`, served to the render browser. See [design-systems.md](corpus/wiki/design-systems.md).

The **app chrome** is The Mechanical, a paste-up board. Tokens in `ui/src/styles/global.css`, faces in `ui/public/fonts/`. The canonical spec is [design.md](corpus/wiki/design.md) (§1–§4) + [design-components.md](corpus/wiki/design-components.md) (§5–§9) — a source comment citing "DESIGN.md §5" means the latter. What shipped: [chrome.md](corpus/wiki/chrome.md).

The `digital-broadsheet` theme was removed in v2; Satori/resvg rendering in v3; the JSON template system and `/builder` in brief 58.

## Constraints / non-goals

- **No LLM, from any provider.** The Wizard pivot removed composing entirely — a post is written by hand in [Newspapper Wizard](corpus/wiki/markup.md), not generated. This supersedes the old "Ollama only" rule; there is no Ollama client left.
- **Do not add** canvas, cheerio, Handlebars, inquirer, ora, axios, or Satori. Playwright and Sharp are ordinary dependencies of `@newspapper/core` — Chromium rendering and image normalization; see [dependencies.md](corpus/wiki/dependencies.md).
- **Dependency versions are pinned exactly.** No `^`, no `~`, anywhere.
- **ESM throughout.** All workspaces are `"type": "module"`. Paths must be resolved from `import.meta.url`, not `process.cwd()`.
- **`npm run build` runs `fmt:check` first**, and `npm run lint` covers all three workspaces. Both were enforced in brief 68, after the linter was found to have enabled zero rules since the project began. Don't unwire either.

## Tests

Co-located `*.test.ts` under `core/src/`, `api/src/` and `ui/src/`, run with `vitest`. Prefer unit tests on parsing and filtering over snapshots of rendered images. Three files (`render`, `fonts`, `font-fallback`) do launch real Chromium and assert on real JPEG bytes; without `npx playwright install chromium` they skip with a loud banner locally and **fail under `CI`**.

**Read [`corpus/wiki/green-because-nothing-ran.md`](corpus/wiki/green-because-nothing-ran.md) before you trust a green command.** That pattern — a tool reporting success while reaching nothing — has been hit nine times in this repo: a DB path the tests set but nothing read, a `.gitignore` rule that would have hidden a module, a vitest `include` that omitted `ui/`, a workspace bundled but never typechecked, a formatter with no config, a test control that collapsed into its subject, an ESLint config with zero rules enabled, a test whose import resolved only through a hoisted optional dependency, and an overflow check pointed at the document instead of the element it was about. When a check passes, ask what it actually reached. (The page collects them; [`corpus/log.md`](corpus/log.md) has each in full.)

## Corpus (the project wiki)

Project knowledge and work live in [`corpus/`](corpus/), run as an
LLM-maintained wiki: **the human curates the sources and asks the questions; the
LLM curates the synthesis and tracks the work.** It is the durable counterpart to
`TodoWrite` (in-session only) and to chat (which evaporates) — a reusable finding
gets folded in here, not left in a transcript.

**[`corpus/index.md`](corpus/index.md) is the entry point; read it before
anything else.** Route with [`corpus/routing.md`](corpus/routing.md). Starting
cold, read [`overview.md`](corpus/wiki/overview.md) then
[`status.md`](corpus/wiki/status.md).

```
corpus/
  index.md     the catalog. Generated: `bash corpus/lint.sh --index`
  routing.md   which question goes to which layer
  lint.sh      health check; exits non-zero on findings
  log.md       append-only, chronological, newest last
  todos/       captured ideas, prose, pre-spec
  briefs/      work specs — todo/ · done/ · superseded/
  wiki/        the synthesis layer. The LLM owns this.
```

### The retrieval budget

A corpus exists to make an agent **cheaper**, not just better-informed.

1. Read `index.md`, then **at most 2–3 wiki pages**. Prefer a page's `summary:`
   line over opening it.
2. Needing a fourth is a **signal, not a licence**: a page is straddling topics
   and must split, or its `summary:` is not sharp enough. Fix the cause.
3. Never read `briefs/` or `todos/` wholesale. `wiki/status.md` holds every
   brief's state in one line; open a brief only for the spec that directed
   specific work.

### Rules

- **Every wiki page opens with frontmatter** — exactly `summary:` and `updated:`.
  The summary is written for an agent deciding whether to open the page, not as a
  title. `index.md` is generated from these; never hand-edit the catalog block.
- **One concept per file.** Split a page past ~200 body lines or straddling two
  topics, and cross-link. The linter enforces the cap. **Split rather than shave
  prose to fit** — a page hits the cap because a second subject has grown inside
  it, and trimming is how that subject stays hidden.
- **Briefs are immutable.** Numbers are stable — never renumber one when it
  moves. Don't edit a brief in `done/`; if later work undoes it, move it to
  `superseded/` with a one-line note. New work gets a new brief in `todo/`.
- **The LLM curates `wiki/` freely.** Rewrite a page as understanding improves;
  it is synthesis, not an append-only log. Stale phrasing is a bug, not history.
- **Standard relative markdown links**, not `[[wikilinks]]`.
- **Absolute dates** (`2026-08-27`), never "yesterday".
- **Never commit corpus changes unless asked.** The user controls when they land.

### Source of truth, when things disagree

1. **The actual code** wins over any wiki claim.
2. A brief in **`done/`** wins over `wiki/` if the wiki hasn't caught up.
3. **`wiki/decisions.md`** and its siblings win over `wiki/status.md` for tech
   choices not formally revisited.

**Verify before quoting.** A page naming a path, function, or commit may have
drifted: check the path exists, grep the symbol, `git log` the hash. Never
recommend an action based on an unverified wiki claim about specific code.

### Maintenance rules

1. **Change route behavior** → update `corpus/wiki/api.md`.
2. **Change a schema** → update `corpus/wiki/data.md`.
3. **Add, remove, or rename a module** → update `corpus/wiki/modules.md` and `architecture.md`.
4. **Add or drop a dependency** → update `corpus/wiki/dependencies.md`.
5. **Change env vars or setup** → update `corpus/wiki/configuration.md` and `.env.example`.
6. **Lock a technical choice** → add an entry to the right decisions page, with what it rejected and why: `decisions.md` (product shape), `decisions-engineering.md` (runtime and library calls), `decisions-security.md` (auth and what is guarded), `decisions-tooling.md` (how the repo is built, formatted, linted, pinned).
7. **After any corpus change** → append one entry at the bottom of `corpus/log.md`:
   `## [YYYY-MM-DD] <kind> | <one-line summary>`, where kind is one of `done`,
   `todo`, `maintenance`, `decision`, `ingest`, `lint`, `incident`, `resume`.
8. **Add a wiki page** → give it `summary:` + `updated:` frontmatter and run `bash corpus/lint.sh --index`.
9. **Before committing corpus changes** → `bash corpus/lint.sh` must exit clean.

### Workflows

| Task | Do |
|---|---|
| Capture an idea | Write `todos/<slug>.md` with `title` / `created` / `status: open` frontmatter. One todo per file. |
| Promote to a brief | Next number across all three brief dirs, then `briefs/todo/<NN>-<slug>.md`: Context · Files you OWN · Files you must NOT touch · What to do · Acceptance. Mark the source todo `status: promoted`. |
| Finish a brief | `git mv` it to `briefs/done/` (keep the number), append an outcome note at move time, add a `log.md` entry, then **fold the durable findings into `wiki/`** — `status.md` always, plus the relevant concept page. **If a todo was promoted into it, delete that todo now** — the brief plus its outcome note is the provenance, and a `promoted` todo left behind reads as live work. |
| Ingest a finding | Update the affected wiki pages; create a page if the concept has none; cross-link from `index.md`; log an `ingest` entry. |
| Health check | `bash corpus/lint.sh`, then sweep by hand for contradictions, stale claims, orphan pages, and named-but-pageless concepts. Log a `lint` entry. |

### What NOT to put in the corpus

- Contents of `data/` or `output/` — both gitignored, ephemeral.
- In-progress task state — use TodoWrite. `corpus/` is for what outlives the session.
- One-session debugging notes — put them in the PR description.
- A code graph's output as fact. The corpus is the *why*; structural questions go to `grep`.

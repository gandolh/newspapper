---
summary: Dated snapshot (2026-11-07) of Newspapper, per area — the Wizard rebuild (2026-08-27 to 09-01), the 2026-09-27 improvements sweep (fixed 2026-10-02/03), local accounts with Ward as a second way in (2026-10-13), the Reader (2026-10-09, schema v6), the docs site on Docusaurus and the wax fix (2026-10-19), the API on built JavaScript under node (2026-11-04), the galley painting its own text selection (2026-11-05), feed fetches connecting only to the address they checked and text selections in non-photo blue (2026-11-06), the README's editing GIF retaken (2026-11-07), the API in the house code structure (2026-11-11); what is deployed (the accounts) and what may not be (the Reader), the owner's next steps, the green-because-nothing-ran thread, and the known strays.
updated: 2026-11-11
---

# Status — 2026-11-06

`origin/main` is at `b3c2ac6`; the local commits after it (`5d71ed4` and the
briefs reset) are not pushed. `npm test` passed 908 tests in 76 files on
2026-11-04, and brief 03 added four to the galley's Chromium test;
`npm run gate` runs build, tests, lint and the corpus lint with `CI=1`. There is
no GitHub CI, by the owner's choice (2026-10-04). Brief numbering restarted at
01 on 2026-11-02 (see [../log.md](../log.md), "Briefs reset"). Brief 06,
[a post as a video](../briefs/blocked/06-a-post-as-a-video-with-hyperframes.md), was
filed on 2026-11-09 and is blocked since 2026-11-10: the owner wants no video
export yet. Before it,
brief 01 retook the README's editing GIF on 2026-11-07, after briefs 03 and 05
changed how a selection paints. Brief 07 (Base UI 1.9.0) was built on 2026-11-10 and awaits a deploy, and brief 08 (the house-style harness) on 2026-11-11. Briefs 07 to 11 (Base UI 1.9.0, the house-style harness, Base UI by the conventions, the UI on Tailwind, the API in the house structure) were filed on 2026-11-10 from the owner's calls of 2026-11-09, and were revised to the owner's grilling of 2026-11-10, with a redesign brief (12) added; see [../log.md](../log.md). Nothing is open in
[open-questions.md](./open-questions.md): how a selection inside the waxed
element shows was settled on 2026-11-06 (non-photo blue) and built the same day.

## By area

- **The Wizard rebuild** (2026-08-27 to 2026-09-01). A post is a
  [Newspapper Wizard](./markup.md) document written in a split-screen editor and
  compiled to 1080² JPEG slides, with no model anywhere. The template system,
  `/builder` and the AI surface are gone; three slide themes form one family
  ([design-systems.md](./design-systems.md)).
- **The chrome** (2026-08-31, finished 2026-09-01). The Mechanical: a paste-up
  board with a two-course tray under 640px ([chrome.md](./chrome.md)). Since
  2026-10-19 the galley's wax is one run laid under the text, so it no longer
  covers letters; since 2026-11-05 the galley paints a text selection too, at
  the text's height, where the textarea's `::selection` used to hide the
  selected text. Since 2026-11-06 every text selection in the chrome is
  non-photo blue under graphite, not wax, and in the galley it lies over the
  element's wax, so a selected word inside the selected element shows its
  extent.
- **Tooling** (2026-08-31). Vite + React replaced Astro; the formatter and the
  linter actually run, and `npm run build` runs `format:check` first
  ([decisions-tooling.md](./decisions-tooling.md)). Since 2026-11-11 the repo is on the
  house style: the vendored `house-style` 1.0.0 configs, one reformat (double quotes, width 120),
  `tsc` reading the 49 test files it used to skip, named exports, and `npm run check` /
  `check:fast`. Follow-up counts, measured 2026-11-11: `noUncheckedIndexedAccess` is off and
  would report 80 errors in source (`core` 34, `api` 1, `ui` 45) and 245 in tests (171, 16, 58);
  `exactOptionalPropertyTypes` would report 23 (`core` 5, `api` 12, `ui` 7). Both checkers run
  `--warn-only`: `check-base-ui` reports 43 (rule 5: 42 CSS modules and `global.css`),
  `check-structure` reported 50 errors (rule 2: 1, rule 3: 7, rule 6: 42) and 6 warnings (rule 11) until
  brief 11, below.
- **The API's structure** (2026-11-11, brief 11). `api/src` is in the estate's
  code structure: `server.ts` listens, `app.ts` builds, `config.ts` alone reads
  the environment, the plugins are `fastify-plugin` wrapped, and each feature is a
  folder whose routes validate their input and encode their replies with zod
  ([modules-api.md](./modules-api.md), [decisions-api.md](./decisions-api.md)).
  `check-structure` runs strict: 0 errors (from 50) and 3 rule-11 warnings in
  `ui`. The error handler now covers every route (a route's 500 used to send its
  message), publish no longer sends a server path, a malformed body is a 400
  rather than stored or a 500, and the SSE streams end when the server closes.
  Built and checked locally; it ships with the next deploy.
- **Hosting.** It runs on the shared VPS at `/newspapper/` behind Caddy, which
  strips the prefix; the UI builds every browser URL with the base.
- **The 2026-09-27 sweep** (fixed 2026-10-02 and 2026-10-03). The guard decides
  from the matched route; RSS fetches go to public addresses only and are
  capped; 5xx bodies are generic and a JWKS outage fails closed; migrations are
  transactional, editor saves single-flight and render directories reserved;
  the render browser can't leak or hang; list routes are O(1) queries and the
  grid loads small thumbnails; the parser caps nesting and the editor has an
  error boundary; one module owns the repo root
  ([decisions-hardening.md](./decisions-hardening.md)). Since 2026-11-06 a
  feed fetch also connects only to the address it checked, through
  `node:http` with a vetting lookup, which closes the DNS-rebinding gap the
  sweep had accepted.
- **Accounts** (2026-10-13). Local accounts on the shared ward-auth library
  (vendored 0.3.1), with "Sign in with Ward" when configured; identity was
  Ward's alone from 2026-09-06 until then
  ([decisions-accounts.md](./decisions-accounts.md)). Local dev signs in with a
  seeded account or through a local Ward
  ([configuration.md](./configuration.md#local-sign-in)).
- **The Reader** (2026-10-09). Feed items are stored (schema v6) and refreshed
  in the background, and `/reader` reads them in three panes with Search,
  Library and Sources as its views; `/articles` redirects there
  ([data-reader.md](./data-reader.md), [api-reader.md](./api-reader.md)).
- **Runtime** (2026-11-04). The container runs built JavaScript under plain
  `node` (`node api/dist/server.js`): `core` and `api` compile with `tsc`, and
  the image has no npm, no tsx and no dev dependencies. Idle memory measured
  locally went from 175 MiB to 87 MiB
  ([decisions-tooling.md](./decisions-tooling.md#the-api-runs-built-javascript-started-by-node)).
  The seed in the container is `node api/dist/seed.js`.
- **Docs site** (2026-10-19). Docusaurus at `/newspapper/docs` with the same
  URLs; its sync publishes every wiki page. `vps-deploy` flipped the stack to
  Docusaurus the same day.

## Deployed, and not

**The accounts change is in production.** Ward's record of the cutover
(2026-10-13) says production newspapper serves its own `/auth/session` with
Ward enabled. Whether the Reader, on `main` since 2026-10-09, went out with that
deploy is not recorded here; the README still calls it undeployed. Check
production's schema version (`PRAGMA user_version`, 6 with the Reader) before
assuming either way. The docs site and the wax fix (2026-10-19) came after, and
are built and checked locally only, as are the built-JavaScript runtime
(2026-11-04), the galley's text selection (2026-11-05), the connect-time
address check on feed fetches and the blue selections (2026-11-06).

## Next (owner)

- **Confirm the Reader in production**, or deploy it: the v6 migration runs on
  boot, so back the database up first. The background refresh then starts 15 s
  after boot and fetches every enabled feed every 30 minutes
  (`READER_REFRESH_MINUTES`).
- **Deploy the docs site, the wax fix, the built-JavaScript runtime, the
  galley's text selection, the connect-time address check and the blue
  selections** from `vps-deploy` (`node cli.ts newspapper all`), then check the
  container's idle memory on the box against the 138 MB it held on
  2026-11-04; in the editor, select a word inside the selected heading (it
  shows on blue with its exact extent, inside the yellow run) and some text in
  the inspector (the same blue); and refresh the Reader once: every enabled
  feed should still fetch.
- **Deploy the API's new structure** (brief 11): `node cli.ts newspapper
  deploy` from the vps-deploy checkout. The Dockerfile is unchanged (`CMD` still
  `node api/dist/server.js`); the image build was not run locally. After it,
  `docker stop` should end the container at once with exit 143, and a render,
  a search and a Reader refresh should still stream to their end.
- **vps-deploy's `cutover-oidc.ts` seeds through `npm run seed` inside the
  container**, which needs tsx and no longer works there. Its command becomes
  `node api/dist/seed.js`; that change belongs to vps-deploy.

## The thread worth reading first

[green-because-nothing-ran.md](./green-because-nothing-ran.md) — ten times a
tool in this repo reported success while reaching nothing. A DB path the tests
set but nothing read; a `.gitignore` rule that would have hidden a module; a
vitest `include` omitting `ui/`; a workspace bundled but never typechecked; a
formatter with no config; a test control that collapsed into its subject; an
ESLint config with **zero rules enabled**; and a test whose import resolved only
through a hoisted optional dependency.

Most of this project's real defects were not in the code. They were in the
things that were supposed to be checking it.

## What the pivot removed

Compose and the whole Ollama client · the `/prompt` page and `data/prompt.md` ·
slide-level AI · generated captions · `TemplateDoc`, the nine template JSON
files, the registry, and `/builder` · PNG output · the four-step wizard ·
Astro.

## What it added

The `.wzd` language, its parser, formatter, and linter · a split-screen editor
(source · preview · inspector + component palette) · a fixed semantic component
library · image upload and processing via Sharp · username/password auth ·
keyword-filtered RSS with a saved-article library · `draft`/`published` states ·
two more themes · The Mechanical · a hand-rolled router.

## What carried over untouched

`TNode` and the template interpreter (now a compile target, not an authoring
surface) · the theme token system · Playwright Chromium rendering · SQLite
storage · the npm workspace layout · the shared UI primitives on Base UI.

## Known strays

Found while writing the docs, and **all but two are now resolved.** Deleted
2026-08-31: a v2/v3 build-plan tree, an Ollama-only compose file, a root
`tsconfig.json` extended by nothing and pointing at a root `src/` that held no
files, and the resolved resume document. The dead-config cleanup (2026-08-31) then took the code half —
`loadConfig()` and its seven inert variables, and `api`'s unrunnable `start`
script.

What is left is genuinely benign:

| Stray | What it is |
|---|---|
| `api/src/server.ts` | The SPA fallback still tries a per-route `index.html` first and its comment names a build that is gone. Harmless — the root `index.html` fallback is what serves. |
| `data/sources.json` | v2 residue: a one-time seed for the `sources` table. Nothing reads it afterwards. |

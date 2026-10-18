# Task 108 — Move the docs site from Starlight to Docusaurus

## Context

On 2026-10-18 the owner decided to move every project's docs site from Astro
Starlight to Docusaurus. `docs/` (`@newspapper/docs-site`, served at
`/newspapper/docs/`) is one of them.

The recipe is written and verified. The `corpus-docs-site` skill
(personal-skills v0.31.0, source in
`~/projects/my-personal-skills/skills/corpus-docs-site/`) now scaffolds
Docusaurus 3.10, and `references/migrating-from-starlight.md` beside it holds
the file, config and content maps plus ten gotchas, each hit during a real
port. **Read that guide first.** The files this brief tells you to copy are in
the same folder. If the installed plugin is older than v0.31.0, read them from
the source path.

What the site has today (2026-10-18):
- base `/newspapper/docs/` (`DOCS_BASE ??`), light only (both `Theme*.astro`
  overrides), 26 sidebar links, with TypeDoc opening in a new tab;
- one authored page, `src/content/docs/index.mdx` (a `Diagram`, a raw `<dl>`,
  `tableOfContents`);
- `src/styles/theme.css`, "The Mechanical" (266 lines, 38 `--sl-*` tokens,
  Archivo + Spline Sans Mono via `@fontsource`);
- `scripts/sync-corpus.mjs` with a **hand-kept list of 24 pages**, which is
  brief 107's bug: four wiki pages never reach the site;
- `scripts/build-diagrams.mjs` (one archify diagram);
- TypeDoc (`../core/src/index.ts` → `public/reference`);
- `docs/package.json` uses `^` ranges, against this repo's exact-pin rule.

**Built through Docusaurus on 2026-10-18.** All 30 corpus pages, the four
missing ones included, built through the new sync in `markdown.format: 'detect'`
mode. In MDX mode the corpus does not compile. Two findings:
- `corpus/wiki/decisions-security.md` (line 142) links
  `../../../wzd_auth/corpus/wiki/integrating.md`. Docusaurus fails the build on
  that link. Starlight's sync had turned it into a 404ing GitHub URL under
  this repo's `corpus/`.
- **Four broken anchors**, reported as warnings, all into `decisions.md`, whose
  headings have moved or been split:
  - `#the-markup-is-the-source-of-truth`, from `data.md`;
  - `#flow-layout-with-stacks--never-absolute-positioning`, from
    `decisions-engineering.md` and `glossary.md`;
  - `#format-and-lint-the-markup-like-jsx`, from `markup.md`.

**This brief also does brief 107.** The new sync discovers every
`corpus/wiki/*.md` instead of reading a list, so the four pages render and the
links to them resolve on the site. That is the cause 107 named.

**Two repo rules meet this migration:**
- **ESM.** CLAUDE.md says "all workspaces are `"type": "module"`", and
  `decisions-tooling.md` records ESM for `core`/`api`/`ui`. Docusaurus 3.10's
  build fails with `"type": "module"` in the site package
  (`require.resolveWeak is not a function`, reproduced 2026-10-18). The docs
  workspace has to be the exception. Its scripts are `.mjs`, so they stay ESM.
- **Forbidden packages.** `dependencies.md` keeps cheerio on `core`'s forbidden
  list. Docusaurus brings cheerio in **transitively**, through
  `@docusaurus/plugin-content-blog` (part of `preset-classic`, even with the
  blog off) and `@easyops-cn/docusaurus-search-local`. It lands in the docs
  workspace only, and nothing in the app imports it.

## Files you OWN

- `docs/` (the site files: config, `scripts/`, `src/`, `public/`→`static/`,
  `package.json`, `tsconfig.json`, `.gitignore`, `README.md`). `docs/images/`
  and `docs/making-a-post.md` stay as they are.
- `package-lock.json`
- `CLAUDE.md` (the ESM bullet only: name the docs workspace as the exception)
- `README.md` (line 72, "The Starlight docs site")
- `corpus/wiki/decisions-tooling.md` (a new entry), `corpus/wiki/dependencies.md`
  (a short docs-workspace note), the four anchor fixes above, and
  `corpus/lint.sh` (the line-18 comment that names "Starlight", comment only)
- `corpus/briefs/todo/107-…` (moving it, see step 9)

## Files you must NOT touch

- `core/`, `api/`, `ui/`, and their dependency lists. The forbidden list keeps
  meaning what it means there.
- `corpus/wiki/*.md` link text, except the four anchor fixes. Fix the renderer,
  not the source.
- vps-deploy. Its brief 11 switches the `newspapper` docs stack's check from
  `_astro/` to `assets/`.

## What to do

1. **Ask the owner first** whether a transitive cheerio in the docs workspace
   is acceptable. The list reads as the app's rule, but it is phrased "do not
   add". If the answer is no, stop: the alternative is a docs build without
   `preset-classic`'s blog plugin and without local search, which is a
   different brief.
2. **Baseline.** `npm run docs --workspace=docs`, then save
   `(cd docs/dist && find . -name index.html | sort) > /tmp/np-routes-before.txt`.
3. **Config.** Write `docs/docusaurus.config.ts` from the skill's reference.
   Set baseUrl `process.env.DOCS_BASE ?? '/newspapper/docs/'`,
   `trailingSlash: true`, `routeBasePath: '/'`, `markdown.format: 'detect'`,
   light-only `colorMode`, local search, and the GitHub navbar item. Port the
   26-link sidebar to `docs/sidebars.ts` and add brief 107's four pages
   (`api-reader` after `api`, `data-reader` after `data`, `modules-reader`
   after `modules`, `migrations` near `data`). TypeDoc becomes
   `{ type: 'link', href: 'pathname:///reference/' }`. Content lives in
   `docs/docs/`.
4. **package.json** per the guide, **pinned exactly** (no `^`), with no
   `"type": "module"`. Keep the `browserslist` and add `start`/`docs`/`typecheck`.
   Keep `typedoc` and the two `@fontsource` packages, now pinned. Drop `astro`,
   `@astrojs/starlight`, `cookie` and `sharp`. `core` and `api` declare their own
   `sharp` (see `green-because-nothing-ran.md`, item 8), so check that with a
   grep.
5. **Content.** `src/content/docs/index.mdx` → `docs/docs/index.mdx`, with
   `slug: /` and `hide_table_of_contents` / `toc_max_heading_level`. Use the
   skill's `Diagram.tsx` (`@site/src/components/Diagram`). Reword "twenty-four
   maintained pages" to the new count, or drop the number. `git mv
   public/diagrams static/diagrams`, and point `build-diagrams.mjs` at it.
6. **Sync.** Use the skill's `sync-corpus.mjs`, with `GITHUB_REPO` set to this
   repo's GitHub URL and
   `OTHER_REPOS = { wzd_auth: 'https://github.com/gandolh/ward-auth' }`.
   Discovery publishes six pages the old list left out: brief 107's four, plus
   `decisions-accounts` and `decisions-hardening`. Publish all six unless the
   owner wants one kept back (the script's `DENY` set), and add the two
   decisions pages to the sidebar next to their siblings. TypeDoc's `"out"`
   becomes `"static/reference"`.
7. **Theme.** Port The Mechanical to `src/css/custom.css` with the guide's
   token and selector maps. The skill's `references/custom.css` header lists
   them. Keep the `@fontsource` imports.
8. **Record and wire.**
   - `decisions-tooling.md`: the docs workspace is not `"type": "module"`,
     because Docusaurus's build fails with it (the error above). Its scripts
     are `.mjs`. Rejected: keeping Starlight, which was the owner's call.
   - `dependencies.md`: a short note that the docs workspace carries cheerio
     transitively, with the owner's answer from step 1.
   - Fix the CLAUDE.md ESM bullet, `README.md` line 72 and the `lint.sh`
     comment.
   - Rewrite `docs/README.md` (lines 12–18 describe Starlight and
     `astro.config.mjs`), and drop its "four pages are not in the page list
     yet" paragraph.
   - `docs/.gitignore`: `.astro/` → `.docusaurus/`, `src/content/docs/wiki/` →
     `docs/wiki/`, `public/reference/` → `static/reference/`.
   - Fix the four anchors in the corpus.
9. **Brief 107.** When this brief is done, move 107 to `briefs/superseded/`
   with a one-line note naming this brief, and update `status.md`.

## Acceptance

- `npm run docs --workspace=docs` exits 0 with `onBrokenLinks: 'throw'` and no
  broken-anchor warning.
- Route parity: the new route list equals `/tmp/np-routes-before.txt` plus
  `./search/index.html` and the six newly published `wiki/*` routes (fewer, by
  any page the owner put in `DENY`).
- `docs/docs/wiki/` holds `api-reader.md`, `data-reader.md`, `modules-reader.md`
  and `migrations.md`. The generated `api.md` links `./api-reader.md`, not a
  GitHub URL. All four are in the sidebar.
- `grep -c '/newspapper/docs/assets/' docs/dist/index.html` is non-zero, and
  `grep -rl '_astro' docs/dist` finds nothing.
- No `^` or `~` in `docs/package.json`.
- `npm run gate` passes: build, test, lint and corpus lint, with `CI=1`.
- Browser check, with `docs/dist` served at `/newspapper/docs/` by a plain
  static server (not `docusaurus serve`):
  - the landing page renders in The Mechanical, with Archivo and Spline Sans
    Mono loading and no 404s;
  - the diagram and `/reference/` load;
  - there is no theme toggle;
  - search returns results.
  Screenshot the landing page.

## Out of scope

Deploying. The owner deploys after vps-deploy brief 11 flips the `newspapper`
docs stack.

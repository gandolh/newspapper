# Task 107 — The docs-site sync leaves out four wiki pages

## Context

Found 2026-10-09 while writing `docs/README.md`. The docs site
(<https://gandolh.ro/newspapper/docs/>) renders the wiki through
`docs/scripts/sync-corpus.mjs`. Four wiki pages never reach it:
`api-reader.md`, `data-reader.md`, `modules-reader.md` and `migrations.md`.
Brief 105 added the first three, and `migrations.md` was never listed. The site
shows `api`, `data` and `modules` without the halves that were split off them,
and links to the missing pages fall through to GitHub URLs.

## Cause (confirmed)

An explicit allowlist, not a filename filter. `docs/scripts/sync-corpus.mjs:27-52`
is a hand-written `PAGES` array of `{ src, slug }` entries (24 of them, plus
`log.md`). `main()` loops over only that array (`:111`), so a wiki file that is
not listed is not rendered. The same array feeds `KNOWN` (`:55`), which
`rewriteLinks` (`:89`) uses to decide whether a link becomes `/wiki/<slug>/`.
For an unlisted page the link falls through to the GitHub fallback at `:93-96`
(`https://github.com/gandolh/newspapper/blob/main/corpus/...`), so every wiki
link to the four pages points off-site.

`corpus/wiki/` has 27 files; the array covers 23 of them (and `log.md`, which
is outside `wiki/`). The four missing ones are the gap. `docs/src/content/docs/wiki/`
is gitignored and rebuilt on each run, so nothing else needs to change for the
pages to appear.

## What to do

1. Add the four entries to `PAGES`, next to their siblings, so the order stays
   "sidebar-ish": `api-reader` after `api`, `data-reader` after `data`,
   `modules-reader` after `modules`, `migrations` near `data`.
2. Better than patching the list again: make the script fail loudly when a file
   in `corpus/wiki/` is not listed in `PAGES` (and warn on a listed page that is
   missing, which it already does at `:114`). That is the "green because
   nothing ran" shape in [green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md);
   the allowlist drifted silently for the whole of brief 105.
3. The Starlight sidebar in `docs/astro.config.mjs` (the `sidebar:` array, from
   about line 45) lists wiki slugs by hand, so a synced page is built but not
   in the sidebar until it is added there too. Add the four.
4. `docs/src/content/docs/index.mdx` says "twenty-four maintained pages in
   all". Update the count to match the new total, or phrase it without a
   number.
5. `docs/README.md` (written 2026-10-09) ends its page table with a paragraph
   saying the four pages are not in the page list yet. Delete that paragraph
   (one line) and, if wanted, add the pages to the table.

## Acceptance

- `npm run sync-corpus --workspace=docs` prints 28 pages (24 + 4) and
  `docs/src/content/docs/wiki/` contains `api-reader.md`, `data-reader.md`,
  `modules-reader.md` and `migrations.md`.
- A rendered link from `api.md` to `api-reader.md` resolves to
  `/wiki/api-reader/`, not a GitHub URL (grep the generated `api.md`).
- Adding a throwaway `corpus/wiki/zz-test.md` makes the sync fail with a
  message naming it; removing it makes the sync pass.
- `npm run docs --workspace=docs` builds, and the four pages are in the
  sidebar and in `docs/dist/`.
- `bash corpus/lint.sh` passes.

## Out of scope

The page content of the four wiki pages, the corpus layout, TypeDoc, the
diagram step, and deploying the site (vps-deploy publishes `docs/dist/`).

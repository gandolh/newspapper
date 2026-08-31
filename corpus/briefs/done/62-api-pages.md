# Task 62 — API surface and page map

## Context

The four-step wizard is gone — there is no pipeline to step through any more.
The app becomes a small set of pages around the editor, and the API is reshaped
to match. This is the brief that makes the other briefs' pieces into one app.

Agreed page map:

| Route | Purpose |
|---|---|
| `/` | The editor. Opens a new draft. |
| `/posts` | Post library, filtered by `draft` / `published`. |
| `/articles` | Saved-article library plus the scrape/search panel. |
| `/settings` | What remains: default theme. |
| `/login` | Authentication. |

Deleted: `/prompt` (brief 51), `/builder` (brief 58), `/sources` (folds into
`/articles`, brief 60), `/history` (becomes `/posts`).

## Files you OWN

- `api/src/server.ts`, `api/src/routes/posts.ts`, `api/src/routes/health.ts`
- `ui/src/pages/posts.astro`, `ui/src/pages/settings.astro`
- `ui/src/pages/history.astro` (delete), `ui/src/components/history/**`
- `ui/src/components/wizard/**` (delete), `ui/src/components/export/**` (fold
  into the post view)
- The nav / sidebar
- `corpus/wiki/api.md`

## Files you must NOT touch

`core/src/**`. Other briefs own `/articles` (60), the editor (59), and auth (55).

## What to do

1. **Posts routes:** list with status filter and keyword filter, create (a
   hello-world starter), read, update markup, delete, render, publish, export.
   Update writes the markup and re-derives the metadata columns from `<head>`.
2. **`/posts` page:** title, status, updated date, keywords, thumbnail of the
   first slide. Actions: open in editor, render, publish, export ZIP, delete.
   Publish is a deliberate action with a confirm — it is not automatic.
3. **Delete the wizard.** The stepper, `Wizard.tsx`, `ScrapeStep`, and the step
   deep-linking (`?post=&step=`) all go. Redirect `/history` to `/posts` for one
   release rather than 404ing a bookmarked page.
4. **Export** moves from a wizard step to an action on a post.
5. **Settings** keeps only the default theme. If that leaves the page too thin to
   justify itself, say so in the outcome note rather than inventing settings.
6. Keep SSE for render — it is slow enough to need progress.

## Acceptance

- Every page in the map loads, is behind auth, and is reachable from the nav.
- No route or component references a wizard step.
- `npm run build`, `npm test`, `npm run lint` pass.
- `corpus/wiki/api.md` matches the implemented routes exactly — verify by
  reading the router, not by memory.

---

## Outcome — 2026-08-31

Landed. Build, 630 tests, lint, `tsc -p ui` (0 errors) and corpus lint all green
at the wave-6 gate.

**Caveat on this note:** the implementing agent's own handoff was lost when the
session's task registry was cleared. The code was on disk and verified, so this
note is written by the controller from the diff and the routers, not from the
agent's report. Treat the *reasoning* below as reconstructed; the *facts* were
read out of the code.

**The page map is the one that was agreed**, and nothing else survives:
`/` (editor) · `/posts` · `/articles` · `/settings` · `/login`, plus an
unlinked `/kitchen-sink` for the component library. `ui/src/components/wizard/`,
`history/` and `export/` are deleted along with `ui/src/pages/history.astro`;
`/history` is an Astro `redirects` entry to `/posts` for one release so a
bookmark lands somewhere useful. Nothing references a wizard step any more.

**Posts routes** grew `POST /api/posts`, `PUT /api/posts/:id/status`, and query
filters (`status`, `keyword`, `search`, `limit`, `offset`) on the list. Both
write paths still take only `{markup, theme?}` and derive the index columns from
the parsed `<head>` — brief 59's contract, extended rather than rewritten.

**`GET /api/renders` is new** and is the reason `/posts` is one request rather
than N. It returns the latest render per post, and it reads the run directory
instead of reconstructing filenames from `slideCount`: a pre-brief-57 run holds
`1.png`, a cleaned-out run holds nothing, and the library has to show what is on
disk rather than what the row claims. `outputDir` is withheld — it is a server
path.

**Unknown themes are now rejected at save time**, on both `PUT /api/settings`
and the two post write paths. Previously an unknown id was stored happily and
then thrown on by `loadTheme` at the next render — a bad save that failed two
steps later, in a different screen, as a render error.

**Settings was not too thin to justify itself**, so nothing was invented: it
carries the default theme (this brief) and the password change (brief 55).

**Publish is behind a confirm**, as the brief required, and so is delete.

Also folded in by the controller: the `ui` workspace's `typecheck` is now part
of the root `build` script — see the log entry "green because nothing ran" —
and the corpus updates brief 59 deferred (`api.md` rewritten against the
routers, `modules.md` given the `@newspapper/core/wizard` subpath,
`dependencies.md` given `@use-gesture/react@10.3.1`).

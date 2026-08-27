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

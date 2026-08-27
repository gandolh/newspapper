# Task 60 — Keyword-filtered RSS and the article library

## Context

Scraping survives the pivot, reshaped: the declared RSS feeds are fetched on
demand and filtered by keywords the user supplies, results are shown for the
user to **choose what to save**, and saved articles form a library they write
from. Scrape results are transient — only saved articles are persisted
(brief 52).

## Files you OWN

- `core/src/scrape/**` — keyword filtering and ranking
- `api/src/routes/scrape.ts`, `api/src/routes/articles.ts`,
  `api/src/routes/sources.ts`
- `ui/src/pages/articles.astro` and its islands
- `ui/src/pages/sources.astro` — folds into `/articles`

## Files you must NOT touch

`core/src/wizard/**`, the editor, the renderer, `core/src/storage/db.ts`.

## What to do

1. **Search endpoint.** Takes keywords, fetches the enabled sources, and returns
   matches **without persisting anything**. Matching is case-insensitive
   substring across title + body, **OR** across the supplied keywords, ranked by
   match count. No fuzzy matching.
2. Keep the existing SSE progress protocol — fetching several feeds is slow
   enough to need it, and the pattern already works.
3. **Results view.** Each result shows source, title, date, and an excerpt, with
   a save action. Saving writes to `articles` with `saved_at`, deduping on
   `(source_id, guid)`.
4. **Library view.** All saved articles: filter by source, filter by keyword,
   full-text search over the saved body, and delete.
5. **"Start a post from this."** Creates a **draft with a hello-world starter
   document** — a valid `.wzd` seeded with the article's title in `<head><title>`
   and a `<Source>` pointing at its URL, ready to write over. Keep it dumb; it is
   a starting point, not an import.
6. **Sources management** moves into this page: add, edit, enable/disable,
   delete, and a "test feed" action. Sources live in the DB now, not
   `data/sources.json`.

## Acceptance

- Searching returns ranked matches and persists nothing — verify the `articles`
  count is unchanged after a search.
- Saving is idempotent: saving the same article twice leaves one row.
- Deleting a source leaves its already-saved articles intact and readable
  (that is what the denormalized `source_name` is for).
- "Start a post from this" produces a document that parses, lints clean, and
  renders.
- `corpus/wiki/api.md` reflects the reworked routes.

---

## Outcome — 2026-08-27

Done. `scrape()` became `searchArticles(sources, { keywords, ... })` and
**persists nothing** — v3 saves only the articles you pick, which is what let the
six deprecated shims 52 left behind (`upsertArticles`, `articlesForDate`,
`addManualArticle`, `insertMany`, `todays`, `existsByUrl`) all be deleted.

Keyword matching is settled and recorded in `wiki/decisions.md`: title + body,
OR across keywords, case-insensitive substring, ranked by total occurrence count
rather than by how many distinct keywords hit — that rewards an article actually
about the topic over one mentioning it once.

`/sources` is deleted and folded into `/articles` as a third tab, reusing
`SourcesIsland` unchanged. Brief 62 needs to know when it builds the page map.

**Scope withdrawn at dispatch:** "start a post from this article" was in the
brief text but pulled for this wave — it is undecided and the editor (brief 59)
owns it. `wiki/open-questions.md` notes the API already carries what it needs.

`ui/src/components/wizard/ScrapeStep.tsx` still calls `/api/scrape` with the old
`{ maxPerSource }` shape. Dead code, out of this brief's ownership; brief 62
deletes `ui/src/components/wizard/**` wholesale.

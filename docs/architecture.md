# Architecture

## Goals

- **Minimal.** Few dependencies, no background jobs, no daemons, no web server.
- **One command.** `newspapper run` does the whole job.
- **Local-first.** Ollama for the LLM; SQLite on disk; no cloud services.

## Pipeline

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│   scrape    │ → │   compose    │ → │   render     │
│  (RSS only) │   │   (Ollama)   │   │  (Satori)    │
└─────────────┘   └──────────────┘   └──────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
   articles            posts          output/<date>-<n>/
   (SQLite)           (SQLite)            *.png
```

All three stages run sequentially in the same process. There is no queue, no worker, no retry loop beyond per-HTTP-request retries.

## Module layout

```
src/
├── cli.ts              # entry point, argv → run/sources/list/clean
├── run.ts              # the pipeline orchestrator
├── scrape/
│   ├── index.ts        # fetch each source, filter by date, persist
│   └── rss.ts          # rss-parser wrapper
├── compose/
│   ├── index.ts        # build the prompt, call ollama, parse the post JSON
│   └── ollama.ts       # thin HTTP client for /api/generate
├── render/
│   ├── index.ts        # post JSON → PNGs on disk
│   ├── satori.ts       # Satori configuration, font loading
│   ├── resvg.ts        # SVG → PNG
│   └── slides/         # JSX components per slide type (title, body, quote)
├── storage/
│   ├── db.ts           # better-sqlite3 setup, migrations
│   ├── articles.ts     # CRUD for articles
│   └── posts.ts        # CRUD for posts
└── util/
    ├── config.ts       # .env loader + defaults
    ├── logger.ts       # tiny console logger
    └── paths.ts        # resolves output/<date>-<n>/
```

## Key decisions

- **RSS only.** No HTML scraping, no headless browser. Sources without a feed are simply not supported.
- **No entity extraction stage.** The old pipeline had a `compromise`-based entity step. v2 drops it — the LLM sees the raw articles and decides what to write about.
- **One post per day, covering all today's news.** No clustering, no per-topic posts. Simpler prompt, predictable output.
- **LLM picks slide count.** The prompt constrains the model to 2–8 slides; it chooses based on how much there is to say.
- **Satori + resvg, not a browser.** Satori renders a subset of CSS (flexbox, no grid). Templates must respect that subset. In exchange we avoid a 300MB Chromium dependency.
- **Versioned output folders.** Re-running on the same day writes to a new `YYYY-MM-DD-N/` — nothing is overwritten.
- **SQLite for articles, FS for renders.** The DB exists for dedupe and history. PNGs and `slides.json` live on disk where they're easy to copy out.

## What was removed from v1

- Playwright (headless browser scraping)
- `compromise` (entity extraction) and the entire entities table
- `@napi-rs/canvas` and Sharp (replaced by Satori + resvg)
- The `format` REPL command and the preview step
- Handlebars prompt templating (a single string template in code is enough)
- `inquirer` and `ora` (no interactive menus, no spinners)
- The `digital-broadsheet` theme
- OpenAI summarization path

## What was kept

- `data/sources.json` (now RSS-only entries)
- `design-systems/warm-industrial.yaml` (the visual spec)
- `templates/warm-industrial/*.html` (reference designs — rewritten as Satori JSX in `src/render/slides/`)
- `fonts/` (loaded by Satori at runtime)
- Ollama as the LLM
- `newspaper-infra/docker-compose.yml` (local Ollama via Docker)

---
summary: What Newspapper is, the v1→v2→v3 lineage that explains its shape, and what lives where at the top level.
updated: 2026-08-27
---

# Overview

**Newspapper** turns today's RSS news into an Instagram-style slide post — a set
of 1080×1080 PNGs plus a caption, ready to upload. It runs entirely on the
local machine: a wizard in the browser walks one post from feeds to ZIP.

```
RSS feeds  →  scrape  →  compose (Ollama)  →  edit  →  render (Chromium)  →  ZIP export
```

UI at `http://localhost:4321`, API at `http://localhost:3001`. One post per day,
no CLI, no approval gates between steps.

## Lineage (why it looks the way it does)

Three rewrites, each of which left fingerprints on the current design:

- **v1** — a CLI with entity extraction, clustering, per-topic posts, an
  interactive REPL, and an OpenAI backend. All of it removed; the surviving
  scars are the `no-*` entries in [decisions.md](./decisions.md).
- **v2** — a single `newspapper run` command rendering through Satori + resvg.
  Simpler, but the renderer could not do real layout, which is what pushed v3
  to headless Chromium.
- **v3** (current) — the CLI became a web app: a Fastify API, an Astro + React
  wizard, a JSON template system, and a visual template builder. Shipped as 13
  parallel agent briefs, all archived in [`../briefs/done/`](../briefs/done/).

## The cast

| Workspace | Package | Job |
|---|---|---|
| `core/` | `@newspapper/core` | The pipeline library — scrape, compose, render, storage, template interpreter. No HTTP, no UI. |
| `api/` | `@newspapper/api` | Fastify on 3001. Every `/api/*` route, SSE for long operations, static serving in prod. |
| `ui/` | `@newspapper/ui` | Astro pages with React islands: wizard, history, sources, settings, prompt, builder. |

Full structure and dependency direction: [architecture.md](./architecture.md).

## What lives where

| Path | Contents |
|---|---|
| `assets/` | Template JSON docs, design-system tokens, Inter fonts — the shipped design material. |
| `data/` | Runtime state: `sources.json`, `prompt.md`, `newspapper.db`. Gitignored except sources. |
| `output/` | `YYYY-MM-DD-N/` — rendered PNGs, `slides.json`, `caption.txt`. Gitignored. |
| `corpus/` | This wiki, the brief archive, and the change log. |
| `plans/swarm/reference/` | v2 render code and HTML specs kept as reference for the v3 briefs. |
| `infra/` | A single `docker-compose.yml`. |
| `DESIGN.md`, `PRODUCT.md` | Root-level design system and product register — see [design-systems.md](./design-systems.md). |

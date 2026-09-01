---
summary: What Newspapper is — write a post in .wzd markup, compile it to 1080² JPEGs — plus the v1→v3 lineage and the Wizard pivot that explain its shape, the three workspaces, and what lives where at the top level.
updated: 2026-08-31
---

# Overview

**Newspapper** turns a story into an Instagram-style slide post: a set of
1080×1080 JPEGs plus a caption, ready to upload. You write the post yourself, as
a [Newspapper Wizard](./markup.md) (`.wzd`) document, in a split-screen editor —
source on one side, the live 1080 canvas on the other. The app compiles it and
screenshots each slide in headless Chromium.

```
.wzd document  →  compile  →  HTML  →  Chromium  →  1080² JPEGs  →  publish / ZIP
```

RSS is still here, but only as a **library of source material** to write from —
search feeds by keyword, save what is useful, quote it in a post. It is not a
pipeline that produces one.

**No model is involved anywhere.** The person writes the words. See
[the decision](./decisions.md#no-llm-in-the-product).

Runs entirely on the local machine, behind a single username and password. UI at
`http://localhost:4321`, API at `http://localhost:3001`. No CLI.

## Lineage (why it looks the way it does)

Four passes, each of which left fingerprints:

- **v1** — a CLI with entity extraction, clustering, per-topic posts, an
  interactive REPL, and an OpenAI backend. All removed; the surviving scars are
  the `no-*` entries in [decisions.md](./decisions.md).
- **v2** — a single `newspapper run` command rendering through Satori + resvg.
  Simpler, but the renderer could not do real layout, which is what pushed v3 to
  headless Chromium.
- **v3** — the CLI became a web app: a Fastify API, an Astro + React wizard that
  scraped and then had Ollama compose the slides, a JSON template system, and a
  visual template builder.
- **The Wizard pivot** (2026-08-27 onward, current — the package is still
  versioned `3.0.0`, and "v4" in this wiki means the *SQLite schema*, not the
  product) — **the LLM came out and a language went in.** A post stopped being generated and started being
  written. With it went compose, the prompt page, the four-step wizard, the
  template system and `/builder`; in came the `.wzd` language and its compiler,
  the split-screen editor, single-account auth, image uploads, JPEG output, a
  three-theme family, and a new app chrome. Astro was then removed too — every
  page was fully hydrated behind auth, so nothing it offered was in use.

The thirteen v3 briefs are archived in [`../briefs/done/`](../briefs/done/) and
describe a product that no longer exists; briefs 51–72 describe this one.

## The cast

| Workspace | Package | Job |
|---|---|---|
| `core/` | `@newspapper/core` | The library — the `.wzd` parser/formatter/linter/compiler, the TNode interpreter, Chromium rendering, RSS search, image uploads, SQLite storage, theme loading. No HTTP, no UI. |
| `api/` | `@newspapper/api` | Fastify on 3001. Every `/api/*` route, the session guard, SSE for search and render, static serving in prod. |
| `ui/` | `@newspapper/ui` | A Vite + React SPA on 4321: editor (`/`), `/posts`, `/articles`, `/settings`, `/login`. |

Full structure and dependency direction: [architecture.md](./architecture.md).

## What lives where

| Path | Contents |
|---|---|
| `assets/design-systems/` | The three slide themes as JSON tokens — [design-systems.md](./design-systems.md). |
| `assets/fonts/` | Inter TTFs, read off disk by the render browser. |
| `ui/public/fonts/` | Archivo + Spline Sans Mono for the app chrome, and a second Inter copy for the preview canvas. |
| `data/` | `newspapper.db`. Gitignored, auto-created. (`data/sources.json` is tracked, but only as the one-time seed for the `sources` table.) |
| `uploads/` | `originals/` + `normalized/` image store. Gitignored, path overridable. |
| `output/` | `YYYY-MM-DD-N/` — rendered JPEGs, `slides.json`, `caption.txt`. Gitignored. |
| `corpus/` | This wiki, the brief archive, and the change log. |

## Where to read next

- Cold start: this page, then [status.md](./status.md).
- **Before you trust a green command in this repo**, read
  [green-because-nothing-ran.md](./green-because-nothing-ran.md).
- The language a post is written in: [markup.md](./markup.md).
- The two design systems, which share nothing on purpose:
  [design-systems.md](./design-systems.md) (the slides) and
  [chrome.md](./chrome.md) (the app).

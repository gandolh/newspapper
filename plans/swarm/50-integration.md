# Wave 5 — Integration: E2E verification, fixes, docs rewrite

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs). It was just rebuilt by a swarm of agents from a CLI into a local web app ("v3"):

- npm workspaces monorepo: `core/` (pipeline library: templates+interpreter, Playwright render, Ollama compose, SQLite storage, RSS scrape), `api/` (Fastify :3001, SSE for long ops, serves `/assets/fonts` + `/output` + ui/dist in prod), `ui/` (Astro + React islands, dev proxy to :3001).
- Slide layouts: JSON `TemplateDoc` files in `assets/templates/warm-industrial/` interpreted to HTML, screenshotted by Chromium at 1080×1080. Satori/resvg and the CLI are gone.
- LLM: Ollama local or Ollama Cloud (`https://ollama.com` + `OLLAMA_API_KEY` Bearer). `.env` should contain a working cloud key (`OLLAMA_HOST=https://ollama.com`, `OLLAMA_API_KEY=...`, `OLLAMA_MODEL=<pick a small cloud model from GET /api/models>`). **If `.env` has no key, STOP and report — the orchestrator must get it from the user.**
- UI flow: `/` wizard (Scrape & curate → Compose → Edit slides → Export/ZIP), `/history`, `/sources`, `/settings`, `/prompt`, `/builder` (visual template editor).

You are the LAST agent. Everything is built; waves were verified in isolation. Your job: make it work end-to-end, fix integration bugs, and rewrite the documentation. You may edit ANY file. Do not git commit (orchestrator commits).

## Task 1 — Static checks

`npm install` clean from root; `npm run build` (typechecks + astro build) green; `npm test` green; `npm run lint` green (fix or, for noisy stylistic rules only, adjust config minimally). Check `plans/swarm/NEEDS.md` if it exists — resolve every item (install missing deps properly in the right package.json, or implement workarounds) and note resolutions.

## Task 2 — Live E2E (the real thing, via curl + the running app)

Start `npm run dev`. Then, in order:

1. **Sources**: `POST /api/sources` a real feed (e.g. `{"id":"bbc","name":"BBC World","rss":"http://feeds.bbci.co.uk/news/world/rss.xml","enabled":true}`); ping it.
2. **Scrape**: `POST /api/scrape` — articles for today land in the DB.
3. **Compose**: `POST /api/compose` with real article ids against Ollama Cloud — a valid draft `PostRow` comes back (2–8 slides). If model errors, try a different small model from `GET /api/models`.
4. **Edit ops**: `PUT /api/posts/:id` with a modified payload; `POST /api/slide-ai` remap one slide cross-family; `POST /api/posts/:id/caption`.
5. **Render**: `POST /api/posts/:id/render` — PNGs in `output/<date>-N/`; open one PNG and sanity-check it's a real 1080×1080 slide (not blank/unstyled — fonts must have loaded; a blank or default-font render means fontBaseUrl/static serving is broken: fix it).
6. **Preview**: `POST /api/preview` for all 9 templates with their samples → HTML containing sample text.
7. **ZIP**: `GET /api/posts/:id/export.zip` → `unzip -l` shows PNGs + slides.json + caption.txt.
8. **UI smoke**: load `/`, `/history`, `/sources`, `/settings`, `/prompt`, `/builder` — no blank pages, no console errors on load (check the terminal/astro output; if Playwright is handy you may script a quick page-load check reusing the installed Chromium).
9. **Prod mode**: `astro build`, then start the API alone and confirm it serves the built UI at `/` and the wizard page loads.

Fix every breakage you hit. Typical integration bugs to expect: contract drift between waves (prop/route/signature mismatches), fontBaseUrl wrong in render route, SSE frame parsing, masked-API-key clobbering, ESM/workspace import issues, `@newspapper/core/templates` browser-import problems in Astro. Re-run the failing step after each fix.

## Task 3 — Documentation rewrite (now that behavior is final)

Rewrite for v3 (these were written for the v2 CLI):

- `docs/index.md` — update catalog.
- `docs/commands.md` — CLI is gone: replace with "Running the app" (npm scripts, dev vs prod, ports) — consider renaming the page title but keep the filename.
- `docs/architecture.md` — monorepo layout, the three workspaces, pipeline diagram (scrape → compose → edit → render → zip), SSE endpoints.
- `docs/data.md` — new SQLite schema (posts status/output_dir/updated_at, settings KV), `TemplateDoc` format with the TNode/TStyle/token-ref spec, sources.json, prompt.md, output dir convention.
- `docs/modules.md` — core module APIs as actually exported.
- `docs/configuration.md` — `.env` vars (OLLAMA_HOST/API_KEY/MODEL, PORT), settings precedence (DB > env > defaults), Playwright Chromium install note.
- `docs/dependencies.md` — new dep list per workspace + rationale (playwright/fflate/fastify in, satori/resvg/cac out).
- `docs/design-systems.md` — drop Satori constraints; document the template JSON system + token refs; warm-industrial tokens unchanged.
- NEW `docs/api.md` — full route table (method, path, body, response, SSE events); register it in `docs/index.md`.
- `docs/log.md` — append ONE line: `## [<today>] rebuild | v3: CLI → web app (Fastify API + Astro UI), Satori → Chromium, JSON template system + visual builder`.
- `CLAUDE.md` — rewrite to match v3: commands, architecture, constraints (Playwright now allowed; cac/satori/resvg gone; keep "no cloud services" EXCEPT Ollama Cloud as the one sanctioned remote), wiki rules unchanged.
- `README.md` — short v3 quickstart.

## Task 4 — Cleanup

Remove dead files (old reference HTML stays in `assets/templates/warm-industrial/*.html`? NO — the JSON docs are authoritative now; move the HTML files to `plans/swarm/reference/html-specs/`), confirm `.env.example` matches reality, delete any TEMP STUBs left by wave 3 agents (search for `TEMP STUB`), delete throwaway test artifacts. Leave `plans/swarm/` itself in place.

## Final report

Per-step E2E results (including the model used and a description of one rendered PNG), every bug found + fix applied (file:line), docs updated, anything still broken or deferred with reasons.

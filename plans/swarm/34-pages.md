# Wave 3D — Sources, Settings, and Prompt pages

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app. Monorepo: `core/`, `api/` (Fastify :3001, FINISHED), `ui/` (Astro + React islands; dev proxy forwards `/api`, `/output`, `/assets`). You build three standalone management pages, replacing the placeholder contents (keep the App layout wrapper and the existing nav).

Already available (explore before building):
- Kit `ui/src/components/ui/` (Button, Card, Input, Textarea, Select, Toggle, Badge, Modal, Toast/useToast, Spinner, ConfirmDialog, EmptyState…), API client `ui/src/lib/api.ts` (`api<T>()`), types `ui/src/lib/types.ts` (`SourceConfig {id,name,rss,enabled}`, `Settings {ollamaHost, ollamaApiKey, ollamaModel, defaultTheme}`, `Article`, `PostPayload`).

## Rules

- Owned paths: `ui/src/pages/sources.astro`, `ui/src/pages/settings.astro`, `ui/src/pages/prompt.astro`, `ui/src/components/sources/**`, `ui/src/components/settings/**`, `ui/src/components/prompt/**`. Touch nothing else. Missing dep → `plans/swarm/NEEDS.md` (you should need none).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`. Match the warm-editorial style in `ui/src/styles/`.

## Task 1 — Sources page (`/sources`)

API: `GET /api/sources` → `SourceConfig[]`; `POST /api/sources` (409 on duplicate id); `PUT /api/sources/:id`; `DELETE /api/sources/:id`; `POST /api/sources/:id/ping` → `{ok, itemCount?, error?, latencyMs}`.

- Table/list of feeds: name, RSS url (truncated, copyable), enabled Toggle (PUT immediately), health cell, actions (Edit, Delete w/ ConfirmDialog).
- "Ping all" button + per-row ping: spinner → green Badge "ok · 23 items · 412ms" or red Badge with the error on hover/expand.
- Add/Edit Modal: Name, RSS URL, id (auto-slugify from name on create, read-only on edit), Enabled. Client-side URL validation; surface 409 nicely.
- EmptyState with a short "add your first feed" hint.

## Task 2 — Settings page (`/settings`)

API: `GET /api/settings` (apiKey masked as `'***'` when set), `PUT /api/settings` (send `'***'` back untouched = keep existing key), `POST /api/settings/test` → `{ok, error?, models?}`, `GET /api/models` → `string[]`.

- Card "Ollama connection": Host Input (placeholder shows both `http://localhost:11434` and `https://ollama.com`), API key password-Input (helper text: leave `***` to keep the stored key; only needed for Ollama Cloud), "Test connection" Button → success toast with model count, or inline error panel with the message.
- Card "Generation": Model — Select populated from `GET /api/models` (with a Refresh button; on failure fall back to a free-text Input so a model can still be typed), Default theme — Select from `GET /api/themes` (route exists; value `name`).
- Explicit "Save settings" Button (PUT the patch) + saved toast. Show env-fallback hint: "values from .env are used until overridden here".

## Task 3 — Prompt page (`/prompt`)

API: `GET /api/prompt` → `{prompt, isDefault}`; `PUT /api/prompt`; `POST /api/prompt/reset` (restores default); `POST /api/prompt/test` `{articleIds?}` → a `PostPayload` draft (composes against today's articles WITHOUT saving).

- Intro line: this is the system prompt that turns articles into slides — edit to tune voice and slide-type choices.
- Large monospace Textarea (~70vh, the whole prompt), char count, "Save" + "Reset to default" (ConfirmDialog) buttons; `isDefault` Badge when untouched.
- "Test on today's articles" Button → runs the test compose; result panel shows: post title, then one Card per slide with variant Badge and its text fields pretty-printed — enough to judge the prompt's behavior without rendering. Failure (no articles today / Ollama down) → readable inline error; when "no articles" suggest visiting `/` to scrape first.
- Warn before navigating away with unsaved changes (`beforeunload`).

## Verify

`npm run dev` against the real API. Sources: full CRUD + ping against a real public RSS url. Settings: save host/model, test-connection both failure (bogus host) and success if Ollama reachable; confirm the masked-key round-trip doesn't clobber a stored key (set key → save → reload → save again → `GET /api/settings` still shows `'***'`). Prompt: edit/save/reset round-trip; test-compose path at least to a clean error without a live LLM. `astro build` passes.

## Final report

What you built per page, what was verified live (including the masked-key round-trip result), anything blocked and why.

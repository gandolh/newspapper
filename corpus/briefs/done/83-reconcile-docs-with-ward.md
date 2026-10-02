# Task 83 — The docs still describe the deleted login system (and ship it to the public docs site)

## Context

Found in the 2026-09 sweep. The Ward move (2026-09-06), the VPS move, and the
base-path change all landed **after** the wiki's last full reconciliation
(2026-08-31/09-01). CLAUDE.md's own maintenance rules (route→api.md,
schema→data.md, module→modules.md/architecture.md, env→configuration.md) were
followed for `decisions-security.md` — which correctly carries "Superseded/Revised
2026-09-06" notes — but skipped almost everywhere else. Verified stale claims:

- **README.md:34-36** — tells a new dev to leave `SESSION_SECRET` /
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` blank for an `admin` / `newspapper-dev`
  login. All deleted.
- **CLAUDE.md:15** — "Single account, loopback only." Both false (Ward; public
  VPS). **:51** — schema "v4" with a `users` table; actual is v5
  (`CURRENT_SCHEMA_VERSION = 5`, `core/src/storage/db.ts`) with `users` dropped.
- **corpus/wiki/commands.md:61-63** — "land on `/login`; account from
  `ADMIN_USERNAME`/`ADMIN_PASSWORD` or `admin`/`newspapper-dev`." **:75** —
  "There is no `start` script" — false: `api/package.json` has
  `"start": "tsx src/server.ts"`, and it is the Dockerfile's production `CMD`.
- **corpus/wiki/configuration.md:10-11,123-125** — contradicts its own correct
  Ward section 50 lines below; still says auth vars are "required outside
  development" and "leave SESSION_SECRET/ADMIN_* blank."
- **corpus/wiki/api.md:12-45** — documents `POST /api/login`, `/api/logout`,
  `/api/password`, a `newspapper_session` HMAC cookie — all deleted; `/uploads`
  still "public"; the real `GET /api/me` shape (`{ user: { subject, username } }`)
  undocumented.
- **corpus/wiki/architecture.md:54-62,89,174** — "guard except /api/login,
  /api/logout"; `/login` in the route table; "/uploads — public"; `users` in
  storage; "No cloud services at all. Everything is loopback."
- **corpus/wiki/data.md:3,10,78-85** — "Schema version: 4" (actual 5) and a full
  `users` table section.
- **corpus/wiki/overview.md:26-27,59** — "Runs entirely on the local machine,
  behind a single username and password"; `/login` in the route list.
- **corpus/wiki/chrome.md:46-47** — tray "pointing at `/login` via SessionMenu";
  SessionMenu now links off-app to Ward. `SessionMenu.tsx:8`'s own comment still
  says "Astro-rendered and static" (Astro was removed before the Ward change).
- **corpus/wiki/decisions.md:142-147** — "Access is behind a single account …
  username and password," with no supersession note, unlike its sibling
  `decisions-security.md`. The two decision pages now disagree.
- **corpus/wiki/status.md:1-8** — snapshot dated 2026-08-31; never updated for
  the Ward/VPS/base-path changes; still lists username/password auth as shipped.
- **corpus/wiki/modules.md:41-44** — documented `renderSlides` signature omits the
  `db` parameter added for the uploads interception (`core/src/render/index.ts:44-46`).

**Amplifier:** `docs/scripts/sync-corpus.mjs` copies `architecture.md`, `api.md`,
`data.md`, `configuration.md`, `commands.md` etc. **verbatim into the public
Starlight site** at `/newspapper/docs` — these are not just internal notes, they
ship publicly. And CLAUDE.md is what the next agent reads first, so its staleness
compounds every future task.

## What to do

One documentation-reconciliation pass (like brief 63), correcting each claim
above against the current code: `api/src/ward/*`, `core/src/storage/db.ts`
(schema 5, no `users`), `api/src/routes/me.ts`, `core/src/render/index.ts`
(the `db` param), the deployment reality (Ward, public VPS at
`https://gandolh.ro/newspapper/`, base path). Where a decision was reversed, add
a dated supersession note rather than silently rewriting (match
`decisions-security.md`'s style). Follow CLAUDE.md's own maintenance rules for
which page owns which fact.

**Do not** describe the local-dev auth story until brief 84 settles it — either
sequence 84 first, or write only what is already true.

## Acceptance

- Every file:line listed above no longer contradicts the code (spot-check each).
- api.md's route table matches the actual routes (no login/logout/password; `me`
  with its real shape); data.md says schema 5 and has no `users` section;
  architecture.md has no "loopback"/"/uploads public"/`users` claims;
  decisions.md carries a supersession note consistent with decisions-security.md;
  modules.md's `renderSlides` shows the `db` param; status.md reflects the Ward +
  VPS + base-path state.
- `bash corpus/lint.sh` clean (frontmatter, page-size cap, links, stale roots).
- If any page crosses the 200-body-line cap after edits, split it per the corpus
  rules rather than shaving prose.
- The docs site still builds (`npm run docs -w @newspapper/docs-site`), since it
  renders these pages.

## Files you OWN

- `README.md`, `CLAUDE.md`
- `corpus/wiki/{commands,configuration,api,architecture,data,overview,chrome,decisions,status,modules}.md`
- `corpus/index.md` only via `bash corpus/lint.sh --index` if a summary changes

## Files you must NOT touch

- `corpus/wiki/decisions-security.md` — already correct; use it as the model
- source code — this is a docs-only brief; if a doc and the code disagree, the
  code wins and the doc changes
- `corpus/log.md` — the controller logs this pass at move time

## Outcome — 2026-10-02

Reconciled against the code (Ward guard and client, schema 5, `routes/me.ts`,
`render/index.ts`, the deploy and base path):
- **README:** the Ward-based quick start (local container, seed writes the key,
  503 without a Ward) and the `/newspapper/` URLs.
- **CLAUDE.md:** schema v5, no `users`. The "loopback only" line was already
  gone after brief 84.
- **commands.md:** sign-in through Ward on `/newspapper/`; `npm run start` is
  the Docker `CMD` (the "no start script" claim was false).
- **configuration.md:** the three Ward variables are required everywhere;
  "No external services" becomes "External services: RSS and Ward".
- **api.md:** login, logout, password and the HMAC cookie are gone; `/api/me`
  is documented with its real `{ user: { subject, username } }`; guard
  semantics (401/403/503, matched-route guarding, generic 5xx).
- **architecture.md:** guard exceptions, `/uploads` guarded and served from
  disk by the render interception, `/login` as a redirect to Ward, the VPS and
  base path instead of "loopback".
- **data.md:** schema 5, and the `users` section replaced by a note.
  `migrations.md` gains the v5 row.
- **overview.md:** Ward, the VPS and the route list. **chrome.md:** SessionMenu
  links off-app to Ward.
- **decisions.md:** "single account" struck through with a dated supersession
  note pointing at `decisions-security.md`.
- **modules.md:** `renderSlides`' full options including `db`, and why it is
  needed.
- **status.md:** a new 2026-10-02 snapshot.

**Found and filed, not fixed (docs-only brief):**
- Brief **103**: Settings still renders a password form that POSTs to the
  deleted `/api/password`.
- Also noted, not fixed: `SessionMenu.tsx:8`'s comment still says the tray is
  "Astro-rendered". That's source code, outside this brief.

Corpus lint is clean (index regenerated). `npm run docs -w
@newspapper/docs-site` builds, so the public site now carries the corrected
pages.

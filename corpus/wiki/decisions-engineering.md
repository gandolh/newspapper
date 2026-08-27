---
summary: The locked engineering calls — workspaces and ESM, pinned dependencies, SQLite, the UI's type copy, and where project knowledge lives.
updated: 2026-08-27
---

# Decisions — engineering

How the repo and the stack are put together. Product-shaping calls live in
[decisions.md](./decisions.md); the same rules apply here — don't reopen one
without an explicit revisit and a [log.md](../log.md) entry.

Reasons marked _(reconstructed)_ were recovered from `log.md` and the git
history rather than recorded at the time.

## Templates are JSON documents, not code
**Status: superseded** by [The template system is removed](./decisions.md#the-template-system-is-removed) (2026-08-27). Kept for the reasoning.

_2026-06-10_ — Each slide variant is a `TemplateDoc` JSON file in
`assets/templates/warm-industrial/`, interpreted at runtime by
`@newspapper/core`.
Rejected: React components (v2) and Handlebars (v1). _(reconstructed)_ A visual
builder has to **read and write** templates, which rules out anything that is
only executable. This is what makes `/builder` possible at all.
See [design-systems.md](./design-systems.md), [data.md](./data.md).

## The builder preview is strict, and says so
_2026-08-27_ — An unknown theme token in the builder surfaces as a visible
warning on the offending node. It neither throws (which would make a
half-finished template uneditable) nor silently renders the literal string
(which is what it did until now).
Rejected: matching core's `resolveStyle`, which throws; and the previous silent
fallback. The failure this closes: the builder would happily preview a template
that the renderer refuses, so you could design something un-renderable and only
find out at export.

## anime.js is the motion engine; Tailwind-bound kits are references only
_2026-08-27_ — Animation is `animejs` 4.5.0 (MIT, no dependencies,
framework-agnostic ESM). It animates DOM nodes, so one import serves both an
Astro `<script>` and a React island, and it has no opinion about how anything is
styled.
Rejected: **motion-primitives** and **smoothui**. Both are shadcn-style
copy-paste React kits that require **Tailwind CSS** (v4 for smoothui) plus
**Motion**, and this UI is Astro islands + CSS Modules + Base UI with no Tailwind
anywhere. Adopting either means importing a second styling system to obtain
animations, which is the wrong trade for a fixed component set. They stay useful
as **pattern references** — read the interaction, reimplement it in CSS Modules.
Standing rules: one authored motion moment per surface rather than scattered
hover effects, everything gated behind `prefers-reduced-motion`, and **no motion
inside the slide canvas** — the preview must never move in a way the renderer
cannot reproduce.

## npm workspaces, three packages, ESM throughout
_2026-06-10_ — `core` / `api` / `ui`, all `"type": "module"`.
Every runtime path must resolve from `import.meta.url`, **never**
`process.cwd()` — the app is started from several working directories and
`cwd()`-relative paths broke in wave 5 (see the path-resolution fixes in
`32af25e`). This is the single most repeated bug in the project's history.

## Dependency versions are pinned exactly
_2026-06-10_ (`5c7ca55`) — No `^` or `~` anywhere in a `package.json`; write the
exact installed version when adding a dependency.
Rejected: caret ranges. The reason is **reproducible installs** — the same
checkout resolves to the same tree on any machine and at any later date, without
a lockfile being the only thing standing between you and a silent upgrade.

## The UI keeps its own copy of the shared types
_2026-08-27_ — `ui/src/lib/types.ts` is a hand-maintained copy of
`core/src/types.ts`, minus the Node-side types (`Theme`,
`RenderTemplateOptions`).
Rejected: importing `@newspapper/core/templates` (which is genuinely
browser-safe and exports these types). `core` ships raw `.ts` with no build step
(`tsc --noEmit`), and while Vite resolves that through the `exports` field in
dev, the types fight the Astro production build. The copy is the cheaper side of
that trade.

**Correction, 2026-08-27.** This entry claimed "a guard test keeps it that way
rather than trust". There is no such test — grep for one and nothing comes back.
The copy held for 2.5 months on discipline alone, and then brief 52 changed
`Article` and added seven interfaces, at which point the mirror silently drifted.
Brief 58 owns `ui/src/lib/types.ts` and must both re-sync it and add the guard
test this entry always claimed existed.

## Login lockout is keyed on address, never on username
_2026-08-27_ — Five failed logins from one address earn a `429` with
`Retry-After` for 60 seconds. In-memory, per-process, capped at 1000 keys,
entries expiring after 15 idle minutes; a success clears the counter.
Rejected: **an artificial delay**, which the brief suggested. Holding a
connection open for N seconds *is* the denial of service the measure exists to
prevent — it hands an attacker free socket exhaustion. Rejected more firmly:
**keying on username.** Newspapper has exactly one account, so a username-keyed
lockout lets any stranger who can reach the port lock the owner out of their own
app indefinitely. The address is the only key that fails safe here.

## The password can be rotated from inside the app
_2026-08-27_ — `POST /api/password` (guarded, requires the current password,
rotates the session cookie on success). No UI yet; the endpoint is ready for one.
Rejected: seeding-only. `ADMIN_PASSWORD` is read at first boot **only**, so
without a rotation path a compromised password could be changed only by
hand-editing SQLite, and the plaintext would live in `.env` forever.

## `/uploads/*` is public; `/api/*` and `/output/*` are guarded
_2026-08-27_ — The upload asset routes serve without a session, deliberately.
Headless Chromium fetches `<Image>` sources mid-render and carries no cookie, so
guarding them would break rendering. The exposure is bounded rather than absent:
a ref carries 32 bits of unguessable entropy, the app is single-user on
loopback, and the routes are marked `public` explicitly so they keep working if
the guarded prefix list grows.
Rejected: minting a render-scoped token — more machinery than a local
single-user app earns. Note this is a real trade, not an oversight: anyone who
can reach the port can serve an upload whose ref they have. If Newspapper ever
leaves loopback, this is the first thing to revisit.

`/output/*` went the other way. The brief only asked for `/api/*`, but the
rendered slides are the app's actual content and were being served to anyone who
asked, so the guard covers them too.

## The default database path is overridable, and tests must override it
_2026-08-27_ — `getDb()` with no argument resolves `NEWSPAPPER_DB_PATH` first,
and only falls back to `repo_root/data/newspapper.db` when it is unset.
Found the expensive way. `api/src/server.test.ts` had set that env var since it
was written, and `defaultDbPath()` never read it — it resolved from
`import.meta.url` unconditionally. Every `npm test` run was therefore opening and
migrating the developer's real database while the test file's own comment
claimed "the DB is ephemeral". Harmless until brief 52 landed a v2→v3 migration
that drops `posts` and `articles`, at which point one test run destroyed the dev
database's contents. A regression test now asserts the override is honoured.

The general lesson is worth more than the fix: a test harness that *sets* an
environment variable is not evidence that anything *reads* it.

## SQLite (better-sqlite3) is the only datastore
_2026-06-10_ — `data/newspapper.db` holds the post history and settings; it is
auto-created and migrated on boot.
_(reconstructed)_ A single-user local app should not require a server process,
and the durable state is small.

## Knowledge lives in `corpus/`, not `docs/` <!-- lint-ok -->
_2026-08-27_ — The project wiki, brief archive, and change log moved to
`corpus/`, as a curated wiki: per-page `summary:`/`updated:`
frontmatter, a generated catalog, and a retrieval budget.
Rejected: keeping the flat `docs/` tree. That layout had no way to distinguish <!-- lint-ok -->
standing synthesis from work specs, and no frontmatter for an agent to triage
on — so every question cost a full-page read. See [../log.md](../log.md).

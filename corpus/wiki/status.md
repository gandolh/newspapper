---
summary: Dated snapshot (2026-10-09) — the Wizard rebuild is done, identity is Ward's, it runs on the VPS under /newspapper/, the 2026-09-27 improvements sweep (77-104) is fully worked through, and brief 105 built the Reader (schema v6), which is not deployed yet; plus the known strays and open questions.
updated: 2026-10-09
---

# Status

_Snapshot: 2026-10-09. Branch `main`, ahead of `origin/main` until the owner pushes._

## Where things stand

The Wizard rebuild (briefs 51-76) is done: a post is authored as a
[Newspapper Wizard](./markup.md) document in a split-screen editor and compiled
to JPEG slides, with no model anywhere. Since then three moves changed where and
how it runs:

- **Identity is Ward's** (2026-09-06): no account, password or login page here;
  a `newspapper` grant on a Ward account opens the app
  ([decisions-security.md](./decisions-security.md)).
- **It runs on the shared VPS** at `https://gandolh.ro/newspapper/`, behind
  Caddy, which strips the prefix. The UI builds every browser URL with the base
  (`ui/src/lib/base.ts`).
- **Local dev signs in through a local Ward** (brief 84,
  [configuration.md](./configuration.md#local-sign-in)).
- **The Reader replaced `/articles`** (brief 105, 2026-10-09): feed items are
  stored (schema v6) and refreshed in the background, and `/reader` reads them
  in three panes, with Search, Library and Sources as its views. Built and
  checked locally; **not deployed**, and production's database has not been
  through the v6 migration yet ([data-reader.md](./data-reader.md),
  [api-reader.md](./api-reader.md)).

**The 2026-09-27 improvements sweep (briefs 77-102) is done**, along with
103 and 104, which were found while doing it. In short:
- the guard decides from the matched route, closing an encoded-path auth
  bypass;
- RSS fetches are SSRF-guarded and capped, 5xx bodies are generic, and a JWKS
  outage fails closed;
- the base path is right in every browser URL;
- migrations are transactional, editor saves single-flight, and render output
  directories reserved;
- the render browser can't leak or hang;
- the list routes are O(1) queries and the grid uses small thumbnails;
- the parser caps nesting, and the editor has an error boundary;
- one module owns the repo root.

Coverage now reaches the real Ward client, the render route, the upload
interception and the UI's base path, and every Chromium suite fails under
`CI`. Gates: `npm run build`, `npm run lint`, `npm test` (896 tests) and
`bash corpus/lint.sh`, all green. `npm run gate` runs all four with `CI=1`;
there is no GitHub CI, by the owner's choice (2026-10-04).

## The thread worth reading first

[green-because-nothing-ran.md](./green-because-nothing-ran.md) — nine times a
tool in this repo reported success while reaching nothing. A DB path the tests
set but nothing read; a `.gitignore` rule that would have hidden a module; a
vitest `include` omitting `ui/`; a workspace bundled but never typechecked; a
formatter with no config; a test control that collapsed into its subject; an
ESLint config with **zero rules enabled**; and a test whose import resolved only
through a hoisted optional dependency.

Most of this project's real defects were not in the code. They were in the
things that were supposed to be checking it.

## What the pivot removed

Compose and the whole Ollama client · the `/prompt` page and `data/prompt.md` ·
slide-level AI · generated captions · `TemplateDoc`, the nine template JSON
files, the registry, and `/builder` · PNG output · the four-step wizard ·
Astro.

## What it added

The `.wzd` language, its parser, formatter, and linter · a split-screen editor
(source · preview · inspector + component palette) · a fixed semantic component
library · image upload and processing via Sharp · username/password auth ·
keyword-filtered RSS with a saved-article library · `draft`/`published` states ·
two more themes · The Mechanical · a hand-rolled router.

## What carried over untouched

`TNode` and the template interpreter (now a compile target, not an authoring
surface) · the theme token system · Playwright Chromium rendering · SQLite
storage · the npm workspace layout · the shared UI primitives on Base UI.

## Known strays

Found while writing the docs, and **all but two are now resolved.** Deleted
2026-08-31: a v2/v3 build-plan tree, an Ollama-only compose file, a root
`tsconfig.json` extended by nothing and pointing at a root `src/` that held no
files, and the resolved resume document. Brief 73 then took the code half —
`loadConfig()` and its seven inert variables, and `api`'s unrunnable `start`
script.

What is left is genuinely benign:

| Stray | What it is |
|---|---|
| `api/src/server.ts` | The SPA fallback still tries a per-route `index.html` first and its comment names a build that is gone. Harmless — the root `index.html` fallback is what serves. |
| `data/sources.json` | v2 residue: a one-time seed for the `sources` table. Nothing reads it afterwards. |

## Briefs

Twenty-six Wizard-rebuild briefs (51–76) are in
[`../briefs/done/`](../briefs/done/) with an outcome note each, alongside the
thirteen v3 ones. Each brief is self-contained: open only the one directing
your work.

**Open since 2026-09-26:** the improvements sweep filed briefs 77–102 into
[`../briefs/todo/`](../briefs/todo/). All are done (84 on 2026-09-27, the rest on
2026-10-02/03), plus 103 (the dead Settings password form, found during 83) and
104 (a JWKS outage answering 401, found by 89's tests).

**Done 2026-10-09:** [105](../briefs/done/105-the-reader.md), the Reader, a
FreshRSS-style zone for following feeds, reading and clipping, which replaced
`/articles`. Filed 2026-10-07; the owner took the recommended answer to its
three decisions. Its outcome note lists the choices the brief left open and two
bugs found only in the browser.

Waves below are the **executed** order, which differs from the originally filed
one: file-ownership collisions the dependency graph alone did not show forced
several briefs apart. `core/src/types.ts` was claimed by both 51 and 52,
`core/src/index.ts` by 51, 53 and 58, `.env.example` by 55 and 56, and the
nav/sidebar by 58, 62 and 64.

```
51 → 52‖53 → 54‖55‖56‖60 → 57‖58‖61 → 59‖65 → 62 → 64 → 68‖71 → 70‖72 → 63
```

| Wave | # | Brief | Depends on |
|---|---|---|---|
| 1 | 51 | Strip the AI surface | — |
| 2 | 52 | SQLite schema for authored posts | — |
| 2 | 53 | Wizard parser, formatter, linter | — |
| 3 | 54 | Component library + compile to `TNode` | 53 |
| 3 | 55 | Single-account authentication | 52 |
| 3 | 56 | Image uploads + Sharp pipeline | 52 |
| 3 | 60 | Keyword RSS + article library | 52 |
| 4 | 57 | Render to JPEG + optimize on publish | 56 |
| 4 | 58 | Retire templates and `/builder` | 54 |
| 4 | 61 | Themes 2 and 3 | 54 |
| 5 | 59 | The split-screen editor | 53, 54, 58 |
| 5 | 65 | Finish the theme family — ramp, rename, guard | 61 |
| 6 | 62 | API surface and page map | 55, 59, 60 |
| 7 | 64 | Rebuild the app chrome as The Mechanical | 59, 62 |
| 7 | 66 | Fix the render typeface | — |
| 8 | 67 | The slide's font fallback stack | 66 |
| 8 | 69 | Two loose ends in `ui/` | 64 |
| 9 | 68 | `fmt` and `lint` cover what they claim | — |
| 9 | 71 | The typeface guard's control; escaping style values | 67 |
| 10 | 70 | Replace Astro with Vite + React | 68, 69 |
| 10 | 72 | The React effect findings 68 suppressed | 68 |
| 11 | 63 | Documentation pass | everything |

Three ordering constraints, recorded because they would have bitten: **58 could
not start before 54 landed** (until the component library rendered, the
templates were the only thing that rendered at all); **64 ran after 59 and 62**,
because the editor's structure is what the world had to clothe; and **63 ran
last**, when the code it describes existed — which also meant after **70**,
since documenting Astro immediately before removing it would have wasted the
pass.

The 13 v3 briefs are also archived in [`../briefs/done/`](../briefs/done/) —
historical, and written against a product that no longer exists.

## What is not done

- Brief 105's deploy, an owner step. The v6 migration runs on boot, and
  production's database has not been through it; back it up first. Then the
  background refresh starts 15 s after boot and fetches every enabled feed
  every 30 minutes. [open-questions.md](./open-questions.md) is empty.
- The strays above.

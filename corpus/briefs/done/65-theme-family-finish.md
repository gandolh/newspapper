# Task 65 — Finish the theme family: the type ramp, the rename, the guard

## Context

Brief 61 shipped `warm-industrial-1/-2/-3` and stopped at three things it could
not reach from inside `assets/design-systems/**`. It was right to stop — all
three need code, and one needs a database migration. This brief finishes the job.

Read brief 61's outcome note first; it lists the exact call sites.

### 1. `size="lg"` and `size="xl"` render identically

Brief 54 found it and brief 61 confirmed it is not a theme problem.
`WZD_TYPOGRAPHY_SCALES` in `core/src/wizard/components/style.ts` maps component
+ size → **token name**, and it currently maps `Heading: { lg: 'display', xl:
'display' }`. `Stat` collides the same way across `md`/`lg`/`xl`. No theme ramp
can fix that: two sizes resolve to one token, so they produce identical output
whatever the token's value is.

This makes a documented prop meaningless — a person writes `size="xl"`, the
linter accepts it, and nothing changes on the slide. Fix it in both places: add
the distinct typography tokens the mapping needs to **all four** theme JSON
files, and update the mapping so **no component resolves two adjacent sizes to
the same token**.

### 2. `warm-industrial` was never renamed to `warm-industrial-1`

Brief 61 shipped the suffixed themes but deliberately left the unsuffixed
`warm-industrial.json` in place, because deleting it would throw
`Theme not found` at ~15 hardcoded call sites it did not own. So the repo now
ships four themes where the decision says three.

The call sites, from 61's survey: `core/src/storage/settings.ts`,
`core/src/util/config.ts`, `core/src/storage/posts.ts`, `core/src/storage/db.ts`
(including the `posts.theme` column default), `ui/src/components/settings/SettingsIsland.tsx`,
and a spread of `*.test.ts` fixtures. `api/src/routes/templates.ts` and
`ui/src/components/builder/**` were on that list but brief 58 deleted them —
verify rather than assume.

**This includes stored data.** Existing `posts.theme` rows hold
`'warm-industrial'`. A migration has to rewrite them, and it must be idempotent
and safe against a database that has already been migrated. Follow the existing
mechanism in `core/src/storage/db.ts`; do not invent a second one.

### 3. The acceptance test brief 61 could not write

Brief 54 exports `missingThemeTokens(theme)`, and a theme that fails it is
refused at compile time. Brief 61 verified all four themes return `[]` by
running a script, but could not add the test — it lives in `core/src/**`. Add
it: a test that loads **every** theme in `assets/design-systems/` and asserts
`missingThemeTokens` returns `[]` for each. It must fail if someone adds a theme
that is missing a token, without anyone having to remember to update a list.

## Files you OWN

- `core/src/wizard/components/style.ts` — the typography scale table
- `assets/design-systems/*.json` — the token ramps
- `core/src/storage/db.ts` — the migration and the column default
- `core/src/storage/settings.ts`, `core/src/storage/posts.ts`, `core/src/util/config.ts`
- `ui/src/components/settings/SettingsIsland.tsx`
- Test fixtures across the repo that name a theme
- `corpus/wiki/design-systems.md`

## Files you must NOT touch

`core/src/wizard/**` other than `components/style.ts` · `core/src/uploads/**` ·
`api/src/auth/**` · `ui/src/components/editor/**` · `ui/src/components/ui/**`
and `ui/src/styles/global.css` (brief 64 owns the app chrome — this brief is
about **slide** themes only)

## What to do

1. Design the extra typography tokens and add them to all four themes, keeping
   the family rule: type, spacing and shape tokens identical across themes,
   colour the only difference.
2. Update `WZD_TYPOGRAPHY_SCALES` so no component maps two adjacent sizes to one
   token. Add a test that asserts this mechanically across every component and
   size in the catalogue, so the invariant survives the next person editing the
   table.
3. Rename `warm-industrial` → `warm-industrial-1` at every call site, delete the
   unsuffixed JSON, and migrate `posts.theme`.
4. Add the every-theme `missingThemeTokens` test from §3 above.
5. Update `corpus/wiki/design-systems.md`, removing 61's "Legacy
   `warm-industrial.json`" section once it is no longer true.

## Acceptance

- `listThemes()` returns exactly three names.
- No component resolves two adjacent sizes to the same typography token, asserted by a test that walks the catalogue rather than by a hand-written list.
- `missingThemeTokens` returns `[]` for every theme, asserted by a test that discovers themes from the directory.
- The migration is idempotent, runs clean against a database whose posts hold `'warm-industrial'`, and is tested against one.
- `grep -rw "warm-industrial" core/src api/src ui/src` returns nothing outside a migration's historical string.
- `npm run build`, `npm test`, `npm run lint` pass.

---

## Outcome — 2026-08-31

Done, +16 tests. All three parts landed.

Five typography tokens added (`display-xl`, `display-lg`, `headline-sm`,
`label-sm`, `label-xs`), identical across all three themes since type is the
family invariant. The ramp is now eleven monotone steps. It was extended
**upward rather than re-centred**, so `md` — the default every existing post
uses — renders exactly as before; a re-centred ramp would have silently reflowed
every slide already written.

The no-collision invariant is proved by a test that discovers components from
`WZD_TYPOGRAPHY_SCALES` and steps from `allowedValues`, names none of them, and
asserts adjacent steps differ both in token name **and in resolved `fontSize`
across every theme `listThemes()` returns** — the second is what actually proves
the slide changes. A coverage guard fails the suite if a new text component
arrives without a scale. Verified by injection: reverting `Quote.xl` fails three
tests with `Quote size="lg" and size="xl" both render at 96px`.

**Schema v4** renames `warm-industrial` → `warm-industrial-1` in `posts.theme`
and `settings`, and rebuilds `posts` to change the column default — but only when
`sqlite_master` still shows the old default, which is what makes the expensive
half a no-op on re-run. **The rebuild drops foreign keys for its duration and
restores them in a `finally`:** with FKs on, `DROP TABLE posts` fires
`ON DELETE CASCADE` and silently takes `post_keywords` and `renders` with it.
That was probed against a real SQLite file before the migration was written.
Tested against a database seeded from the literal v3 schema with legacy rows, a
`warm-industrial-2` row that must be left alone, a keyword link and a render row.

The acceptance grep this brief was given was itself wrong: `grep -rw
"warm-industrial"` also matches the suffixed names, because `-` is a non-word
character. The useful form is `grep -rnE "warm-industrial([^-0-9]|$)"`.

`listThemes()` returns exactly three ids and a test asserts that list, so a
fourth theme is a deliberate act that fails the suite.

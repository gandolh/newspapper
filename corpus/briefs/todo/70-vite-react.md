# Task 70 — Replace Astro with Vite + React

## Context

Requested by the owner on 2026-08-31. The app is a single-account tool that
lives entirely behind authentication, and **every one of Astro's reasons to
exist is unused here**:

- All six pages mount their island with `client:load` — full hydration, no
  partial hydration, no islands benefit.
- Five of the six page files are **8-line shells** that render one React
  component. `.astro` totals 360 lines across the whole app, 290 of which are
  `App.astro` (67) and `Sidebar.astro` (223).
- There is no SEO surface, no static content, and no unauthenticated page but
  `/login`.

So the app pays for a second framework and a second build model, and gets a
static-site generator's benefits on a dynamic single-user tool. It should be a
plain Vite + React SPA.

Two things that look like losses and are not: `ClientRouter` and the tray's
`transition:persist="sidebar"` exist to keep the sidebar mounted across
navigations. In an SPA the tray **never unmounts**, so both disappear rather
than needing replacements.

`api/src/server.ts` already falls back to `index.html` for non-API GETs in
production, so deep links are served today. Verify it, don't assume it.

## Files you OWN

- `ui/**` — the whole workspace: `astro.config.mjs` (delete), `ui/package.json`,
  a new `vite.config.ts`, `ui/src/pages/**`, `ui/src/layouts/**`,
  `ui/src/components/Sidebar.astro`, `ui/index.html`
- `vitest.config.ts` and the root `package.json` scripts, **only** as far as the
  build/dev/typecheck wiring requires
- `corpus/wiki/architecture.md`

## Files you must NOT touch

- `core/**`, `api/**`, `assets/**`. If the SPA fallback in `api/src/server.ts`
  turns out to be wrong, **report it, do not fix it** — another lane owns `api`.
- `ui/src/styles/global.css` and `ui/src/components/ui/**` — brief 64 shipped the
  chrome and it was measured. **This brief changes no pixels.**
- The React islands' internals (`editor/`, `posts/`, `articles/`, `settings/`,
  `auth/`). They are already plain React and should port untouched. Changing one
  means you have misread the brief.
- Any Prettier/ESLint config — brief 68 owns tooling.

## What to do

1. **Pick a router and justify it.** Six routes, one of them (`/login`) outside
   the app shell, and one redirect (`/history` → `/posts`). Weigh a full router
   against something smaller; the repo adds dependencies reluctantly and pins
   them exactly. Record what you rejected.
2. **Port the shell.** `App.astro` becomes the layout, `Sidebar.astro` becomes a
   React component — its `Astro.url.pathname` becomes the router's current
   location. Keep the markup and class names **identical**; this is a transport
   change, not a redesign.
3. **Port the six routes** and the `/history` → `/posts` redirect, which is
   currently an `astro.config.mjs` entry.
4. **Preserve brief 69's kitchen-sink decision.** That brief decides whether
   `/kitchen-sink` ships, and may gate it in `astro.config.mjs`. Read its outcome
   note in `corpus/briefs/done/` and re-express the same decision in Vite terms.
   Do not silently reverse it.
5. **Carry the dev-server config across**: the `@/*` → `ui/src/*` alias and the
   proxies for `/api`, `/output`, `/uploads`, `/assets` to `localhost:3001`.
6. **Keep the build contract.** `npm run build` must still typecheck `ui` and
   emit to `ui/dist`, and `npm run dev` must still run API + UI together.
   **Critically: `npm run build` begins with `npm run fmt:check &&`, added by
   brief 68 to stop formatting drift. You are rewriting that script — carry it
   forward, or brief 68 regresses the day this lands.**
7. **`.astro` is currently uncovered by the formatter.** Brief 68 dropped it
   from the `fmt` glob rather than install `prettier-plugin-astro`, on the
   explicit reasoning that you were about to delete every `.astro` file. Deleting
   them closes that gap; leaving any behind reopens it.
8. Rewrite `corpus/wiki/architecture.md`'s description of the UI layer.

## Acceptance

- No `.astro` file and no `astro*` dependency remains anywhere.
- All six routes load, are behind auth, and are reachable from the tray;
  `/history` still redirects to `/posts`; a **hard refresh on a deep link**
  serves the app rather than 404ing.
- **The UI is visually unchanged.** Brief 64's chrome was measured — zero
  border-radius, contrast across ~330 elements, 26px grid. Verify you did not
  regress it: `grep -rn "border-radius" ui/src/ | grep -v ": *0"` returns
  nothing, and the tray, editor, posts, articles, settings and login pages look
  as they did.
- The tray stays mounted across navigation (it should now be structural, not a
  directive).
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` is 0.
- `npm run build` still runs `fmt:check` first, and `npm run fmt` is still a
  no-op on a clean tree.
- `npm run lint` still covers `ui/src` — brief 68 extended it there, and the
  ESLint config it fixed had enabled **zero rules** before that. Do not let a
  config rewrite quietly undo it.
- Every dependency added is pinned exactly — no `^`, no `~`.

## A caution

`vitest.config.ts` currently includes `ui/**/*.test.ts`, and that inclusion was
itself once missing — a guard test existed for two and a half months without
ever executing (`log.md`, "green because nothing ran"). If you touch the test
config, **prove the UI tests still run** by counting them, not by seeing green.

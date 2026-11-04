# Task 02 — The API runs built JavaScript, started by node

## Context

The VPS has 3.7 GiB of RAM shared by every app in the estate, and the owner
doesn't want to upgrade it (vps-deploy's `memory-on-the-box` research,
2026-11-04). newspapper's container is the second largest on the box: its
API runs from source under tsx, started through two `npm` processes
(`CMD ["npm", "run", "start", "-w", "@newspapper/api"]`), and on 2026-11-04
the node process held 127 MB with 58 MB more in swap, the container 138 MB.

The owner decided on 2026-11-04 that the apps on the box run built
JavaScript and start with `node` directly. This revisits the Dockerfile's
"runs from SOURCE under tsx" choice for the API; record that in the
decisions page that holds it.

## Files you OWN

- `api/` build setup (a `build` script, `tsconfig` for emit), and `core/` only
  if the API can't be built without emitting it (it ships raw `.ts` today)
- `infrastructure/Dockerfile` (a build stage; the runtime stage runs
  `node` on the output) and `infrastructure/docker-compose.yml` if paths
  change
- `README.md`, `docs/` pages that name the start command
- `corpus/wiki/` pages that say the API runs under tsx, `status.md`,
  `log.md`

## Files you must NOT touch

- `ui/` beyond what the build needs.

## What to do

1. Build the API to JavaScript (`tsc`, or a bundler if workspace imports of
   raw `.ts` make `tsc` awkward; say which and why). Keep the dev scripts on
   tsx.
2. The runtime image runs `CMD ["node", "<built entry>"]`: no `npm`, no
   `tsx`, tsx not in the runtime image. The healthcheck stays.
3. Any script the owner or the deploy runs inside the container (migrations,
   seeds) gets a built entry.
4. Measure the container idle before and after (`docker stats`; Docker is up
   locally).

## Acceptance

- The image builds and the container answers its health check; the API's
  tests pass.
- `npm` and `tsx` aren't in the runtime process tree (`docker top`).
- The outcome gives idle memory before and after. The deploy is the owner's
  step from vps-deploy.

## Outcome (2026-11-04)

Done. The image's `CMD` is `["node", "api/dist/server.js"]`; `docker top` on
the new container shows that one process and nothing else until a render starts
Chromium. tsx, TypeScript and Vite are absent from the runtime image's
`node_modules`.

**Build tool: `tsc`, not a bundler.** `core` and `api` compile into `dist/`,
a mirror of `src/` (`build` is now `tsc` in both; it still typechecks).
`core` finds the repo root by counting `..` from its own file
(`util/paths.ts`, `render/fonts.ts`), and a bundle would move that code to
another depth where fonts, `ui/dist` and the seed list all miss. `core` had to
be emitted too, which the brief allowed: the compiled API imports
`@newspapper/core`, and its exports pointed at `.ts` only. Each export now has a
`newspapper-built` condition pointing at `dist/` ahead of the `.ts` default, so
tsx, Vite, vitest and tsc keep reading source, and only node asks for the
build: `npm run start -w @newspapper/api` passes `--conditions`, and the image
sets it in `NODE_OPTIONS` so `docker compose exec … node api/dist/seed.js` works
without a flag. `core`'s declaration output is off; nothing read it.

**Dockerfile.** A shared `base` (toolchain fallback, manifests), `deps` (full
install) feeding `builder` (tsc for core and api, then the Vite bundle), and
`prod-deps` (`npm ci --omit=dev` plus Chromium) feeding `prod`, which copies
`core/dist`, `api/dist`, `api/vendor`, `assets`, `data/sources.json` and
`ui/dist`. The healthcheck is unchanged. The compose file needed no change.

**Idle memory**, measured locally on Docker Desktop, both images built from the
same base digest and run the same way: scratch env file (`PORT`,
`NEWSPAPPER_BASE=/`, `READER_REFRESH_MINUTES=0`), anonymous volumes, sampled
six times from about two minutes after start.

| | before (tsx) | after (node) |
|---|---|---|
| container, settled | 175 MiB | 87 MiB |
| container, before the first GC | 216 MiB | 115 MiB |
| processes (RSS) | npm 71 MB, sh 2 MB, tsx launcher 59 MB, node 189 MB, esbuild 16 MB | node 144 MB |
| image | 1.44 GB | 1.32 GB |
| `docker stop` | 0.86 s | 0.32 s |

These are relative numbers; the box's will differ, and the Reader's loop was
off in both runs.

**Checks.** `tsc` for core and api (emitting) and the UI's typecheck against the
new exports; `vitest run api/` (123 tests, 9 files, none skipped); eslint and
prettier on the changed files; corpus lint. Locally, the built API booted under
`node --conditions=newspapper-built` and answered `/api/health`, `/`, a
guarded route (401) and a font. In the container: healthy, `/api/health` 200,
`node api/dist/seed.js` created an account, sign-in worked, themes and the
seeded sources loaded, and one sample post rendered (Inter, real Chromium),
published (sharp) and exported (fflate zip).

**Where the brief and the code disagreed.**
- No decisions page held "runs from SOURCE under tsx". It lived in the
  Dockerfile's header and `commands.md`'s Production mode. The revisit is a new
  entry in `decisions-tooling.md` (the build is what changed, and
  `decisions-engineering.md` is near the page cap), dated, with the owner's
  2026-11-04 reason.
- The before container ran one npm process, not two: `npm run start`, then
  `sh`, tsx's launcher, the server's node and an esbuild service.
- README.md and the tracked `docs/` pages never named the start command, so
  neither changed.

**Calls taken without asking.**
- Node is PID 1 now, and PID 1 gets no default action for SIGTERM: `docker
  stop` would have waited ten seconds and killed it. `api/src/server.ts` (outside
  the brief's file list) exits on SIGTERM and SIGINT with the usual codes, as
  the process did when npm forwarded the signal. No graceful drain, as before.
- The condition is in `NODE_OPTIONS` rather than on the `CMD`, so one-off
  scripts work. An env file that sets `NODE_OPTIONS` replaces it and the API
  stops at `ERR_MODULE_NOT_FOUND`; `configuration.md` says to keep the flag.
- `npm run start -w @newspapper/api` now runs the compiled API; `dev` and `seed`
  stay on tsx.
- After the measured build, two Dockerfile comments were corrected (where npm
  nests packages in this install). No instruction changed.

**vps-deploy.** `stacks/newspapper.ts` runs nothing inside the container and
needs no change. `cutover-oidc.ts` seeds the owner account with
`exec … newspapper npm run seed -w @newspapper/api`, which needs tsx and will
fail against the new image; its command becomes `node api/dist/seed.js`.

**Owner steps.** Deploy from vps-deploy (`node cli.ts newspapper deploy`), then
compare the container's idle memory on the box with the 138 MB of 2026-11-04.
Change the seed command in vps-deploy's `cutover-oidc.ts` before running it
again.

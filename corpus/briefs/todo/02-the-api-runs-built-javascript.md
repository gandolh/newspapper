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

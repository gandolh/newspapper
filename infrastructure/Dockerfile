# Newspapper — the news-to-slides app.
#
# Build context is the REPO ROOT (one root lockfile covers the core, api and ui
# workspaces).
#
#   docker compose -f infrastructure/docker-compose.yml up newspapper
#
# ── Two ways this image is not like the rest of the estate ──────────────────
#
# 1. IT IS DEBIAN, NOT ALPINE. Every other service here is node:24-alpine.
#    Newspapper renders slides in a real headless Chromium through Playwright,
#    and Playwright ships no musl build of Chromium — on Alpine the browser
#    simply does not launch. The base is the browser's requirement, not a
#    preference, and it is why this image is the largest on the box.
#
# 2. IT SERVES ITS OWN UI. The estate's other web services are a Caddy-served
#    SPA plus a proxied API container (`WebServiceStack`). Newspapper's Fastify
#    server already serves `ui/dist` itself, along with /output, /uploads and
#    /assets/fonts, so the whole app is one container and one route. That is how
#    it runs today; containerizing it was not the moment to also restructure it.
#
# ── How the API runs ───────────────────────────────────────────────────────
#
# BUILT JavaScript, started by `node` itself: no npm and no tsx in the
# container, and tsx is not installed in the runtime stage at all (2026-11-04,
# the owner's call that the box's apps run built JavaScript; until then this
# image ran `npm run start` → `tsx src/server.ts` from source).
#
# The workspaces still export TypeScript SOURCE for development: tsx, Vite and
# vitest all read `./src/*.ts`. `core`'s exports carry one extra condition,
# `newspapper-built`, that points each entry at its compiled `dist/`, and the
# runtime stage sets `NODE_OPTIONS=--conditions=newspapper-built`, so every
# `node` in the container (the server, the healthcheck, a one-off
# `node api/dist/seed.js`) loads the compiled core. Without the condition, node
# resolves core to its `.ts` source and stops at ERR_MODULE_NOT_FOUND.
#
# Compiled with `tsc`, not bundled. `core` finds the repo root by counting `..`
# from its own file (core/src/util/paths.ts, core/src/render/fonts.ts), and
# tsc's `dist/` sits at the same depth as `src/`, so those counts still land on
# /app. A bundle would move that code to another depth, and every path derived
# from it (fonts, the UI bundle, the seed list) would miss.

# ---------------------------------------------------------------------------
# base — the native-build fallback and the workspace manifests, shared by both
# installs below
# ---------------------------------------------------------------------------
FROM node:24.22.1-bookworm-slim AS base
# better-sqlite3 and sharp both ship glibc x64 prebuilds, so the toolchain is a
# fallback rather than the normal path — but a version bump that drops a
# prebuild would otherwise fail the build with a cryptic node-gyp error.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Manifests first, for layer caching: one root lockfile. All three workspace
# manifests are needed because `npm ci` validates the lockfile against every
# workspace the root package.json declares and bails on a missing one.
COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY api/package.json ./api/
COPY ui/package.json ./ui/

# ---------------------------------------------------------------------------
# deps — the full install, dev dependencies included, for the builder
# ---------------------------------------------------------------------------
FROM base AS deps
RUN npm ci

# ---------------------------------------------------------------------------
# prod-deps — production dependencies only. This is the node_modules the runtime stage
# ships: no tsx, no TypeScript, no Vite.
# ---------------------------------------------------------------------------
FROM base AS prod-deps
# Install scripts run on purpose: better-sqlite3 fetches its prebuilt binary in
# one, and skipping them builds an image that boots and dies on the first query.
#
# Scoped to the two workspaces the runtime loads. The UI is served as built
# files from ui/dist, so its runtime packages (React and the rest) would only
# add weight here.
RUN npm ci --omit=dev --workspace @newspapper/core --workspace @newspapper/api
# No browser here: the prod stage's shared prefix installs the headless shell and its
# libraries.

# ---------------------------------------------------------------------------
# builder — core and api to JavaScript with tsc, and the Vite bundle
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY tsconfig.base.json ./
COPY core ./core
COPY api ./api
# Before the UI's build arg, so a different base path does not recompile them.
RUN npm run build -w @newspapper/core && npm run build -w @newspapper/api
COPY ui ./ui
# Where the app will be served from, baked into the bundle.
#
# Defaults to the origin root, which is right for a standalone `docker compose
# up`. The VPS deploy passes /newspapper/, because Caddy serves the app under
# that prefix (and strips it again before Fastify, so nothing downstream of the
# browser knows about it). Vite rewrites index.html and CSS asset URLs with it
# and re-exports it as import.meta.env.BASE_URL, which ui/src/lib/base.ts reads
# for the app's own URLs — one value, so the two cannot drift apart.
#
# A build arg rather than a runtime env because the bundle is written here: by
# the time the container starts, every URL in it is already decided.
ARG NEWSPAPPER_BASE=/
RUN NEWSPAPPER_BASE=$NEWSPAPPER_BASE npm run build -w @newspapper/ui

# ---------------------------------------------------------------------------
# prod — built JavaScript under node, production dependencies only, and the
# browser with its system libraries
# ---------------------------------------------------------------------------
# THE SHARED PREFIX. These two lines are byte-identical in newspapper, ro-housing
# and gazette, and the three change together: Docker stores a layer once only when
# every layer before it matches, so the box keeps one copy of the browser's
# libraries (about 318 MB) and the headless shell (about 276 MB) instead of one per
# image. Nothing may go between the FROM and the RUN (no LABEL, ENV, ARG, WORKDIR
# or COPY): any of them changes the cache key. Playwright is named here because no
# node_modules exists yet; it must equal the version in package-lock.json, which the
# build-time launch check below enforces. Change the pin or the base in all three
# repos at once. See corpus/wiki/image.md.
FROM node:24.22.1-bookworm-slim AS prod
RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx -y playwright@1.60.0 install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm
LABEL org.opencontainers.image.title="Newspapper" \
      org.opencontainers.image.description="Turns today's news into an Instagram-style slide post"
# Where the shared prefix put the shell; the app reads it at run time.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
# The WHOLE of the prod-deps stage's /app, not just ./node_modules — npm hoists
# most packages to the root tree but leaves some NESTED in a workspace (this
# install keeps fflate in `core/node_modules`; the full install nested sharp's
# `@img/*` platform binaries there too). Copying only /app/node_modules would
# silently leave those behind, and the image would build clean and fail at
# require-time on the render path — the one path a smoke test does not reach.
# Taking the directory wholesale also means a future dependency that nests
# somewhere new is picked up without another line here to forget.
COPY --from=prod-deps /app ./
# Launches the shell with the app's own Playwright and closes it. A Playwright bump
# that leaves the prefix's pin behind fails the build here, not on the first render.
RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"
# The compiled workspaces, beside the manifests and node_modules already in
# place (node_modules/@newspapper/core links to /app/core). No `src/`: nothing
# at runtime reads it. `api/vendor` is the vendored Ward library, which the
# compiled api imports by relative path, so it ships as it is.
COPY --from=builder /app/core/dist ./core/dist
COPY --from=builder /app/api/dist ./api/dist
COPY api/vendor ./api/vendor
COPY assets ./assets
# The seed source list, and the reason /app/data survives as a real directory.
#
# `defaultSourcesPath()` in core/src/storage/db.ts resolves this from its own
# file location to <repo>/data/sources.json — no environment override — and a
# fresh database is seeded from it. The DATABASE, meanwhile, is on the volume at
# /data/newspapper.db via NEWSPAPPER_DB_PATH below.
#
# That split is deliberate. Mounting the host's data dir at /app/data instead
# would have masked this file, and the seeder's `if (!existsSync) return` would
# have swallowed it: a brand-new install would come up healthy, log nothing, and
# have zero news sources.
COPY data/sources.json ./data/sources.json
COPY --from=builder /app/ui/dist ./ui/dist
# NODE_OPTIONS points `@newspapper/core` at its compiled dist/ for every node
# process in the container. See the header.
#
# MALLOC_ARENA_MAX=2: glibc gives every allocating thread its own arena and keeps it,
# and sharp, better-sqlite3 and the Reader's fetches all run on threads. Shelfmark
# measured 46 MB of growth over 13 searches with the default and 31 MB with 2.
ENV NODE_ENV=production \
    MALLOC_ARENA_MAX=2 \
    NODE_OPTIONS=--conditions=newspapper-built \
    PORT=3001 \
    NEWSPAPPER_DB_PATH=/data/newspapper.db \
    UPLOADS_DIR=/data/uploads
# The database and the upload store. A BIND MOUNT on the VPS, so this survives
# every deploy.
VOLUME /data
# Rendered output is a separate volume at the code's default, <repo>/output.
# Since 2026-10-03 it is overridable (OUTPUT_DIR, read once in
# core/src/util/paths.ts), so it could join /data; it stays put because moving
# it would also move every existing run on the VPS.
VOLUME /app/output
EXPOSE 3001
# node's global fetch rather than curl or wget: bookworm-slim ships neither, and
# adding one to the image just to ask a question node can already ask is weight
# on every layer for the life of the service.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# node on the compiled entry: one process, with no npm or sh in front of it
# holding memory or standing between it and the stop signal.
CMD ["node", "api/dist/server.js"]

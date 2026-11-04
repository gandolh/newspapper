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
FROM node:24-bookworm-slim AS base
# better-sqlite3 and sharp both ship glibc x64 prebuilds, so the toolchain is a
# fallback rather than the normal path — but a version bump that drops a
# prebuild would otherwise fail the build with a cryptic node-gyp error.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Browsers outside the home directory, so the runtime stage can copy them by
# path. Left unset they land in ~/.cache/ms-playwright, which is awkward to move
# and easy to lose to a different runtime user.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
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
# prod-deps — production dependencies only, plus the Chromium the renderer
# drives. This is the node_modules the runtime stage ships: no tsx, no
# TypeScript, no Vite.
# ---------------------------------------------------------------------------
FROM base AS prod-deps
# Install scripts run on purpose: better-sqlite3 fetches its prebuilt binary in
# one, and skipping them builds an image that boots and dies on the first query.
RUN npm ci --omit=dev
# Explicit: the `playwright` package has no install step of its own that
# fetches the browser. Without this line the container boots fine and then
# throws "Executable doesn't exist" on the first render — a failure that only
# appears on the one code path nobody exercises before deploying.
RUN npx playwright install chromium

# ---------------------------------------------------------------------------
# builder — core and api to JavaScript with tsc, and the Vite bundle
# ---------------------------------------------------------------------------
FROM deps AS builder
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
FROM node:24-bookworm-slim AS prod
LABEL org.opencontainers.image.title="Newspapper" \
      org.opencontainers.image.description="Turns today's news into an Instagram-style slide post"
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
COPY --from=prod-deps /ms-playwright /ms-playwright
# The browser binary travelled from prod-deps; its shared libraries did
# not, and Chromium is dynamically linked against a long list of them (fonts,
# X client libs, NSS). `install-deps` is the vendor's own list for this exact
# Playwright version, which is the point: a hand-written apt line drifts on
# every upgrade and fails as a browser that will not start rather than as a
# build error.
RUN apt-get update \
 && npx playwright install-deps chromium \
 && rm -rf /var/lib/apt/lists/*
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
ENV NODE_ENV=production \
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

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
# Like just-a-bot and the Farm Valley sim, it runs from SOURCE under `tsx` — the
# workspaces export `./src/*.ts` directly and their `build` script is
# `tsc --noEmit`, so there is no compiled output to ship. The runtime stage
# therefore keeps dev dependencies; splitting them would mean inventing a
# compile step the project does not have.

# ---------------------------------------------------------------------------
# deps — full workspace install, plus the Chromium the renderer drives
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
# better-sqlite3 and sharp both ship glibc x64 prebuilds, so the toolchain is a
# fallback rather than the normal path — but a version bump that drops a
# prebuild would otherwise fail the build with a cryptic node-gyp error.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Browsers outside the home directory, so the next stage can copy them by path.
# Left unset they land in ~/.cache/ms-playwright, which is awkward to move and
# easy to lose to a different runtime user.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Manifests first, for layer caching: one root lockfile, one npm ci. All three
# workspace manifests are needed because `npm ci` validates the lockfile against
# every workspace the root package.json declares and bails on a missing one.
COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY api/package.json ./api/
COPY ui/package.json ./ui/
RUN npm ci
# Explicit, even though the `playwright` package's own install step usually
# fetches this. Relying on that postinstall means a silent `npm ci` change or an
# install-scripts flag turns into a container that boots fine and then throws
# "Executable doesn't exist" on the first render — a failure that only appears
# on the one code path nobody exercises before deploying.
RUN npx playwright install chromium

# ---------------------------------------------------------------------------
# builder — the Vite bundle (the only thing here that is actually compiled)
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY core ./core
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
# prod — source under tsx, plus the browser and its system libraries
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS prod
LABEL org.opencontainers.image.title="Newspapper" \
      org.opencontainers.image.description="Turns today's news into an Instagram-style slide post"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
# The WHOLE of the deps stage's /app, not just ./node_modules — npm hoists most
# packages to the root tree but leaves some NESTED in a workspace, and this
# install does exactly that: `core/node_modules` holds sharp's `@img/*`
# platform binaries and fflate. A `COPY --from=deps /app/node_modules` would
# silently leave those behind, and the image would build clean and fail at
# require-time on the render path — the one path a smoke test does not reach.
# Taking the directory wholesale also means a future dependency that nests
# somewhere new is picked up without another line here to forget.
COPY --from=deps /app ./
COPY --from=deps /ms-playwright /ms-playwright
# The browser binary travelled from the deps stage; its shared libraries did
# not, and Chromium is dynamically linked against a long list of them (fonts,
# X client libs, NSS). `install-deps` is the vendor's own list for this exact
# Playwright version, which is the point: a hand-written apt line drifts on
# every upgrade and fails as a browser that will not start rather than as a
# build error.
RUN apt-get update \
 && npx playwright install-deps chromium \
 && rm -rf /var/lib/apt/lists/*
# Source over the top. These MERGE into the manifests and node_modules already
# in place from the deps stage rather than replacing them.
COPY core ./core
COPY api ./api
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
ENV NODE_ENV=production \
    PORT=3001 \
    NEWSPAPPER_DB_PATH=/data/newspapper.db \
    UPLOADS_DIR=/data/uploads
# The database and the upload store. A BIND MOUNT on the VPS, so this survives
# every deploy.
VOLUME /data
# Rendered output is SEPARATE and cannot join /data: core/src/render/output.ts
# and two API routes resolve it to <repo>/output from their own file location,
# with no environment override. Pointing it elsewhere is a code change, so the
# volume comes to it instead.
VOLUME /app/output
EXPOSE 3001
# node's global fetch rather than curl or wget: bookworm-slim ships neither, and
# adding one to the image just to ask a question node can already ask is weight
# on every layer for the life of the service.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start", "-w", "@newspapper/api"]

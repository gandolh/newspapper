---
summary: What the Docker image holds and why its size is what it is - the browser, the install-deps list, the scoped production install - with the docker history layer sizes before and after brief 14 (2026-11-24), measured on one machine.
updated: 2026-11-24
---

# The Docker image

`infrastructure/Dockerfile`, target `prod`, tagged `newspapper:3.0`. Debian
(`node:24.22.1-bookworm-slim`, pinned), because Playwright ships no musl Chromium. The header
of the Dockerfile has the rest of the reasoning (built JavaScript, the UI served
by Fastify, the `newspapper-built` condition).

vps-deploy keeps each service's previous image for a rollback, so every
megabyte here is paid about twice on a box that gets no extra storage.

## What it holds (since 2026-11-24)

- **Browser: the headless shell only.** `prod-deps` runs
  `npx playwright install --only-shell chromium`. Since Playwright 1.49
  `install chromium` also fetches the full Chromium, but
  `core/src/render/browser.ts` launches with `headless: true` and no `channel`,
  which starts the shell. `/ms-playwright` holds `chromium_headless_shell-1223`
  and `ffmpeg-1011`, nothing else.
- **System libraries: `install-deps chromium`.** The shorter
  `install-deps chromium-headless-shell` was tried and is the same list under
  Playwright 1.60: both installed the same 111 packages and the layer was
  318 MB with either. The longer name stays; nothing was saved by the shorter.
- **Production install scoped to the runtime:**
  `npm ci --omit=dev --workspace @newspapper/core --workspace @newspapper/api`.
  The UI's runtime packages (React, Base UI, DOMPurify and the rest) are not in
  the image; `ui/dist` is built files.

## Layer sizes (`docker history`, 2026-11-24, one machine)

| Layer | Before | After |
|---|---|---|
| `COPY /ms-playwright` | 669 MB | 276 MB |
| `apt-get` + `playwright install-deps chromium` | 318 MB | 318 MB |
| `apt-get` + `playwright install-deps chromium-headless-shell` | not built | 318 MB (same 111 packages) |
| `COPY /app` (node_modules and manifests) | 106 MB | 79.2 MB |
| Whole image (`docker image inspect`) | 1331 MB | 911 MB |

The saving is 420 MB per image. The `install-deps` layer is the next-largest
piece and Playwright gives no shorter supported list.

## Checking a change to the image

A reference post with Romanian diacritics and emoji was rendered through the
API (`POST /api/posts/:id/render`) in the container before and after, and the
three slide JPEGs compared with ImageMagick `compare -metric AE`: 0 differing
pixels on every slide, with either `install-deps` list. Fonts are the one thing
the apt list can change, so a change to that layer should repeat this.

## The shared prefix (brief 16, 2026-11-24)

The `prod` stage starts with exactly two instructions, the same bytes in newspapper, ro-housing and gazette:

```dockerfile
FROM node:24.22.1-bookworm-slim AS prod
RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx -y playwright@1.60.0 install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm
```

Docker stores a layer once only when every layer before it is identical, so the browser's libraries and the headless
shell (one 594 MB layer, replacing the 318 MB and 276 MB ones) are stored once on the box for all three images. That
holds only while the prefix stays byte-identical and the base is the same pinned tag; the base used to float on
`node:24-bookworm-slim`. Rules:

- Nothing goes between the `FROM` and the `RUN` (no `LABEL`, `ENV`, `ARG`, `WORKDIR`, `COPY`): each changes the cache key.
- The three repos change the pin or the base together. The prefix names Playwright 1.60.0 because no `node_modules`
  exists at that point; it must equal the lockfile's version.
- `prod-deps` installs no browser and `prod` copies no `/ms-playwright`; `prod` sets `PLAYWRIGHT_BROWSERS_PATH`
  after the prefix. A build-time `RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"` after
  the app's `node_modules` are copied fails the build if a Playwright bump leaves the prefix's revision behind.
- `MALLOC_ARENA_MAX=2` is in `prod`'s `ENV` (glibc per-thread arenas; Shelfmark measured 46 MB vs 31 MB of growth).

What was measured (2026-11-24): a throwaway image with the same prefix and a different `COPY` shares the five base
layers and the prefix layer with this image (digests equal). `/ms-playwright` holds `chromium_headless_shell-1223` and
`ffmpeg-1011`, no `chromium-<number>`. The whole image is 911 MB before and after: the change is sharing, not size.
After a cache loss the prefix layer gets a new digest (rebuilt with `--no-cache`), so the sharing lasts only while the
box's build cache keeps that step; the vps-deploy prune policy decides how long.

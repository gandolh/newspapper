---
summary: What the Docker image holds and why its size is what it is - the browser, the install-deps list, the scoped production install - with the docker history layer sizes before and after brief 14 (2026-11-24), measured on one machine.
updated: 2026-11-24
---

# The Docker image

`infrastructure/Dockerfile`, target `prod`, tagged `newspapper:3.0`. Debian
(`node:24-bookworm-slim`), because Playwright ships no musl Chromium. The header
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

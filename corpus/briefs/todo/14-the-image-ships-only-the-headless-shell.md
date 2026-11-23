# Brief 14: The image ships only the headless shell

## Context

On 2026-11-24 the box's disk was 90% full after the 2026-11-23 rollout, and
Docker held 26 of its 38 GB. vps-deploy keeps each service's previous image for
a rollback, so every megabyte in an app image is paid about twice, and the box
gets no extra storage (vps-deploy's decisions, 2026-11-06).

`newspapper:3.0` is the second-largest app image on the box. Its layers, from
`docker history` on the box (2026-11-24):

| Layer | Size |
|---|---|
| `COPY /ms-playwright` from `prod-deps` | 672 MB |
| `npx playwright install-deps chromium` | 325 MB |
| `COPY /app` from `prod-deps` (node_modules and manifests) | 138 MB |
| node:24-bookworm-slim | about 250 MB |

Inside today's image, `/ms-playwright` holds two browsers: `chromium-1223`
(377 MB) and `chromium_headless_shell-1223` (260 MB), plus ffmpeg (5 MB).
Since Playwright 1.49, `npx playwright install chromium` downloads both. A
launch with `headless: true` and no `channel`, as
[browser.ts](../../../core/src/render/browser.ts) does, starts the headless
shell, so the full Chromium is never run. ro-housing runs the same Playwright
(1.60) in production with only the shell in its image.

`prod-deps` also runs `npm ci --omit=dev` at the root, which installs the UI
workspace's runtime packages. The runtime serves the UI as built files from
`ui/dist`, so nothing loads them.

## Decisions

- The image gets only the headless shell:
  `npx playwright install --only-shell chromium`.
- `install-deps chromium-headless-shell` replaces `install-deps chromium` only
  if the layer shrinks by at least 50 MB and the slides stay identical (step 6).
  Playwright's own list stays the source either way; the Dockerfile header's
  reason against a hand-written apt line holds.
- The production install is scoped to `@newspapper/core` and `@newspapper/api`.
  The runtime stage keeps copying all of `/app` from `prod-deps`, for the
  nested node_modules the header describes.

## Files you OWN

- `infrastructure/Dockerfile`
- The wiki page that describes the image, for the new numbers

## Files you must NOT touch

- `core/src/render/`: the launch, the screenshots and the fonts stay as they
  are.
- Any `package.json` or `package-lock.json`.

## What to do

1. Make a reference post: a fixture with Romanian diacritics (ă â î ș ț and the
   capitals) and a few emoji in titles and body text, since the seed data may
   have neither. Fonts are the one thing the apt list can change.
2. Build today's image, save `docker history`, render the reference post in
   the container, and keep its slide JPEGs.
3. Switch `prod-deps` to `npx playwright install --only-shell chromium`, and
   confirm `/ms-playwright` holds no `chromium-<number>` folder.
4. Try `npx playwright install-deps chromium-headless-shell` in the runtime
   stage (check that 1.60 accepts the name with `install-deps --help`).
   Record the layer size with each list.
5. Scope the production install:
   `npm ci --omit=dev --workspace @newspapper/core --workspace @newspapper/api`.
   Confirm no package that only `ui/package.json` declares is left.
6. Build on the same machine, render the reference post again, and compare the
   JPEGs pixel by pixel with step 2's. Any non-zero difference goes in the
   outcome with both images. Keep step 4's list only if this comparison is
   clean with it.
7. Check `/api/health`, and that the reference post renders through the API (the
   render route) in the container, as a person in the editor would run it.

If your session can't build Docker images, make the Dockerfile change, run the
repo's checks, and hand back with steps 2, 6 and 7 for the controller.

## Acceptance

- `/ms-playwright` in the image has the headless shell and ffmpeg only.
- The reference post's slides are pixel-identical before and after, or each
  difference is explained in the outcome.
- `npm run check` passes.
- The outcome note has both `docker history` readings, taken on one machine,
  and says which `install-deps` list stayed and why.
- The deploy is the owner's step: `node cli.ts newspapper deploy` from
  vps-deploy.

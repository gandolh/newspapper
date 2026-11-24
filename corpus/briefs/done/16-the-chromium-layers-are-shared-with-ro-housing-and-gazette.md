# Brief 16: The Chromium layers are shared with ro-housing and gazette, on a pinned base

**Depends on:** brief 14 (the headless shell only, on main). **Runs after:** 15.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-24 from the estate's infra review. Three repos run Playwright's Chromium in their image: this one,
ro-housing and gazette. The same change is filed in each (ro-housing's brief 29, gazette's brief 16), with the
same prefix, byte for byte. **This brief carries the check that the sharing works**; the other two depend on it.

## Context

- Each Chromium image builds its own browser layers. Here, `prod-deps` installs the headless shell (line 95) and
  `prod` (line 125) copies the app's `/app` first (line 138), then `/ms-playwright` (line 139), then runs
  `apt-get update && npx playwright install-deps chromium` (lines 146-148). In `docker history` (2026-11-24, after
  brief 14) the libraries are 318 MB and the shell 276 MB. ro-housing builds the same two layers from the same
  Playwright (1.60.0, revision 1223); gazette from 1.63.0.
- The box stores a layer once only when the image's whole chain up to it is identical. These layers sit after
  different `COPY` layers in each image, so they never match: about 580 MB stored twice now (newspapper and
  ro-housing), about 1.16 GB once gazette deploys (estimates from the two measured layers). The box has 38 GB,
  gets no more, and its Docker data reached 26 GB on 2026-11-23.
- **The base floats.** `FROM node:24-bookworm-slim` (lines 47 and 125) follows whatever the tag is on the build
  day. vps-deploy's weekly housekeeping removes a base tag no image uses after two weeks; the next deploy pulls the
  tag's current image and every cache entry keyed on the old one is dead. The three images can't share anything if
  they are built on different days' bases.
- **No `MALLOC_ARENA_MAX`.** glibc gives each allocating thread its own arena and keeps it; sharp, better-sqlite3
  and the Reader's fetches all run on threads here. Shelfmark measured it on 2026-11-23: 13 searches grew the
  process by 46 MB with the default, 31 MB with 2. This was the largest app on the box on 2026-11-24
  (141.7 MiB).

## The shared prefix

The `prod` stage starts with exactly these lines, in all three repos:

```dockerfile
FROM node:24.22.1-bookworm-slim AS prod
RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx -y playwright@1.60.0 install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm
```

Nothing goes between the `FROM` and that `RUN`: no `LABEL`, `ENV`, `ARG`, `WORKDIR` or `COPY`, since any of
them can change the cache key. Everything app-specific comes after, starting with a comment that names the other
two repos and says the three change together.

## Decisions

- Playwright **1.60.0** is the one version for the three. The prefix names it because no `node_modules` exists
  at that point. This repo and ro-housing are on it; gazette moves down from 1.63.0 in its own brief.
- `prod-deps` no longer installs the shell. `prod` no longer copies `/ms-playwright` or runs `install-deps`; the
  base stage's `PLAYWRIGHT_BROWSERS_PATH` goes if nothing in the build stages needs it. `prod` keeps its own
  `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, which the app reads at run time.
- **A build-time check** after the app's `node_modules` are in place launches the shell with the app's own
  Playwright and closes it, for example
  `RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"`, run from a folder that resolves
  the app's `playwright`. A Playwright bump here that leaves the prefix behind then fails the build, not the
  first render.
- Both `FROM node` lines are `node:24.22.1-bookworm-slim`. `MALLOC_ARENA_MAX=2` joins `prod`'s `ENV` block with
  a comment giving the reason.
- **Builders don't edit the prefix.** If a flag in it fails, stop and hand back: the three repos change together.

## Files you OWN

- `infrastructure/Dockerfile`
- `corpus/wiki/image.md` (the layers, the prefix and why it must not drift), and the closeout: the outcome note,
  `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- Any `package.json` or `package-lock.json`.
- `core/src/render/` (brief 15 owns `browser.ts`).
- ro-housing and gazette: their own briefs change them.

## What to do

1. **Check the mechanism (for all three repos).** Build this brief's image, then a throwaway image from a
   two-stage Dockerfile that starts with the same prefix and then copies a different file. Compare
   `docker inspect --format '{{json .RootFS.Layers}}'` of the two: the base layers and the prefix layer must have
   the same digests. Then `docker builder prune -af`, rebuild the throwaway, and compare its prefix digest with
   the first build's. Also check the flags: `/ms-playwright` holds `chromium_headless_shell-1223` (and ffmpeg) and
   no `chromium-<number>`. Write all three results in the outcome. If the prefix digest changes after the prune,
   the sharing lasts only while the box's build cache keeps that step; say so plainly, since vps-deploy's prune
   policy then decides how long the saving holds.
2. Edit the Dockerfile as decided.
3. Build today's image and the new one on the laptop; save `docker history` of each.
4. Brief 14's pixel check: render the reference post through `POST /api/posts/:id/render` in a container of each
   image and compare the slides (`compare -metric AE`, expected 0). `/api/health` answers.

If your session can't build Docker images, make the edit, run the checks, and hand back with steps 1, 3 and 4 for
the controller.

## Acceptance

- [ ] The prefix in the Dockerfile is byte-identical to the block above (`diff` the three lines).
- [ ] Step 1's three results are in the outcome.
- [ ] The image builds; the build-time launch check runs and passes; `docker history` before and after, from one
      machine, in the outcome.
- [ ] Step 4 gives 0 on every slide.
- [ ] `npm run check` exits 0; `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_deploy`.

## Owner steps

- `node cli.ts newspapper server` from vps-deploy. The box shares the layers once ro-housing's brief 29 also ships
  (`node cli.ts ro-housing server`) from the same build cache; gazette has no stack yet.

## Outcome (2026-11-24)

Built. `infrastructure/Dockerfile` starts `prod` with the shared prefix (diff against the brief: identical), both
`FROM node` lines are `node:24.22.1-bookworm-slim`, `prod-deps` installs no shell, `prod` copies no `/ms-playwright`
and runs no `install-deps`, the base stage's `PLAYWRIGHT_BROWSERS_PATH` is gone, and `prod` has its own `ENV`. The
build-time launch check (`RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"`) runs and
passes. `MALLOC_ARENA_MAX=2` is in `prod`'s `ENV` with its reason. `corpus/wiki/image.md` has the prefix and its rules.

- **Step 1, sharing.** A throwaway two-line-prefix image with `COPY a.txt` and another with `COPY b.txt` have identical
  digests for the five base layers and the prefix layer; this brief's image has the same six. Met.
- **Step 1, flags.** `/ms-playwright` holds `chromium_headless_shell-1223` and `ffmpeg-1011`, no `chromium-<number>`.
- **Step 1, after a cache loss.** Not met: rebuilt with `--no-cache`, the prefix layer gets a new digest (the base five
  stay equal). So the box shares the layer only while its build cache keeps that step (or while one image's layer is
  reused as is); vps-deploy's prune policy decides how long the saving holds. Deviation: I used `--no-cache` on the
  throwaway rather than `docker builder prune -af`, since three agents share this machine's build cache.
- **`docker history`** (one machine, saved in the scratch folder): before, `install-deps` 318 MB + `COPY /ms-playwright`
  276 MB + `COPY /app` 79.2 MB; after, one prefix layer of 594 MB (base layers excluded) + `COPY /app` 79.2 MB + a 186 kB
  launch-check layer. Whole image 911 MB both ways: the change is sharing, not size.
- **Step 4.** The reference post (diacritics, emoji, three slides) rendered through `POST /api/posts/:id/render` in a
  container of each image: `compare -metric AE` gave 0 on all three slides; `/api/health` returned `{"ok":true}` on both.
- `npm run check` exit 0; `bash corpus/lint.sh` clean. Ships with `node cli.ts newspapper server`. The sharing with
  ro-housing starts once its brief 29 ships from the same build cache.

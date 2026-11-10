# Task 06: A post as a video, with HyperFrames

## Context

On 2026-11-09 the owner had the skills library review popular repos for
ideas that help their apps (the review is filed in the owner's skills
library as briefs 17-26). One of them, **heygen-com/hyperframes**, read at
`3ff0b3d` (2026-11-09, Apache-2.0), is "a free, open-source framework for
turning HTML, CSS, media, and seekable animations into deterministic MP4
videos". It ships:

- a CLI and an npm package (`hyperframes`, Node ≥22);
- agent skills (`hyperframes`, `hyperframes-cli`, `slideshow`, and
  others);
- a registry of blocks;
- a converter from Remotion.

Newspapper already does the first half of that pipeline. A `.wzd` post
compiles to HTML, and `@newspapper/core` drives Playwright (1.60.0,
`core/src/render/screenshot.ts`) to screenshot each slide as a 1080×1080
JPEG for an Instagram carousel ([overview.md](../../wiki/overview.md)).
Instagram, and the other places a post goes, increasingly favour video
(Reels). Today a post can't be one.

`product.md` sets the tone for motion: "Motion as decoration" is an
anti-goal, and every animation needs a `prefers-reduced-motion`
alternative. A video export has to respect that. Motion here means a slide
holding, then cutting or crossfading to the next, plus at most one
deliberate move per slide. It doesn't mean decoration.

### What it needs to run (read from its repo at `3ff0b3d`)

- **Requirements: Node.js 22+ and FFmpeg** (README). The engine
  (`@hyperframes/engine`) drives headless Chrome through **Puppeteer
  ~25.11** and encodes with FFmpeg.
- **A second headless browser.** Newspapper already ships Playwright's
  Chromium for the JPEGs, and Puppeteer brings its own Chrome. On the
  shared VPS that means disk and memory, and both go into
  `infrastructure/Dockerfile`. Step 1 measures the image size before and
  after. A possible saving, left for the spike to check: point Puppeteer at
  Playwright's Chromium (`executablePath`).
- **A composition** is HTML with `class="clip"`, `data-start` and
  `data-duration` on timed elements.
  - Each composition registers one paused GSAP timeline in
    `window.__timelines[id]`.
  - Nothing may depend on `Date.now()`, an unseeded `Math.random()`,
    network fetches or timers.
  - Fonts outside the bundled ones need `@font-face` to a file in
    `assets/fonts/`, which fits Newspapper's 12 self-hosted faces.
  - `npx hyperframes check --json` lints a composition.
- **Telemetry.** The CLI reports usage, and its agent skill sends a "usage
  beacon" (`npx hyperframes events`) as it starts. A server render runs
  with telemetry turned off (`hyperframes telemetry disable`, or the
  disabled build). Don't vendor its skill into this repo's agent setup
  without the beacon removed.

## Owner decisions (defaults)

1. **Is a video export wanted at all?** Default: yes, as an experiment. The
   compile step is untouched, and a post gains **Export as video** next to
   the JPEG ZIP. If step 1's spike shows HyperFrames can't render the
   compiled slides faithfully, the brief stops there and records why.
2. **The format.** Default: 1080×1920 (9:16, Reels) with the 1080² slide
   centred on the paper colour, 3 s per slide plus 0.4 s crossfades, no
   audio, H.264 MP4. Alternative: 1080×1080 to match the carousel.
3. **Where it renders.** Default: on the server, in `core`, behind the same
   queue and SSE progress as today's renders. Alternative: only from the CLI
   on the owner's machine.
4. **HyperFrames or the existing Playwright.** Playwright alone can record
   video (`recordVideo`), but not deterministically or frame-exactly.
   HyperFrames' seekable timeline is the reason to bring it in. Pin it
   exactly, as this repo pins everything.

## Files you OWN

- `core/src/render/video.ts` (new) and its tests and fixtures.
- `core/package.json` (the `hyperframes` pin) and the lockfile.
- `api/src/routes/renders.ts`: a video render kind on the existing route
  and queue.
- `ui/` components for the export button, the progress and the download,
  styled however the UI is styled when this is built (the owner's skills
  library has a brief moving Newspapper's UI to Tailwind).
- `corpus/wiki/` (`architecture.md`, `decisions-authoring.md`,
  `dependencies.md`, `status.md`), `log.md`.

## Files you must NOT touch

- The `.wzd` compiler and the slide HTML it produces. The video wraps the
  slides; it doesn't change them.
- The JPEG pipeline's output.

## What to do

1. **Spike (half a day at most).**
   - Install `hyperframes` pinned in a scratch copy.
   - Wrap three compiled slides of a real post in a HyperFrames composition
     with the timing from decision 2.
   - Render it, and compare frames at the hold points against the JPEGs:
     fonts (the 12 `@font-face` faces), the paper texture, the wax.

   Record the result and the render time in `corpus/wiki/`. If it fails,
   stop here, with the brief's outcome note saying why.
2. Build `video.ts`: compiled slides in, MP4 out, through the existing
   render queue. A post with one slide gives a 3 s video.
3. **Reduced motion.** The crossfade becomes a cut when the owner's
   settings ask for reduced motion. This is a setting, since a video has no
   media query.
4. Add the UI: the export button, progress over SSE, the download.
5. Add a `decisions-authoring.md` entry: "A post can export as video", with
   decision 2's format and the rejected alternatives. Add `hyperframes` to
   `dependencies.md` with its licence (Apache-2.0) and pin.

## Acceptance

- The spike's frame comparison is recorded, with a hold-point frame
  matching the slide's JPEG by eye (attach both, out of git).
- A real post exports to MP4 in the owner's chosen format, plays in a
  browser, and lasts slides × 3 s + crossfades.
- The JPEG export is byte-for-byte unchanged for the same post (compare
  hashes).
- The repo's lint, tests and builds pass.

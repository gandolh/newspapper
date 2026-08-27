# Wave 1B — Render service: HTML → PNG (Playwright) + output dirs + ZIP export

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/` (pipeline library), `api/` (Fastify), `ui/` (Astro+React). Slide layouts are JSON templates interpreted into self-contained HTML documents **by another agent**; you never touch templates. Your job: given finished HTML strings, produce PNGs, manage output directories, and build ZIP archives.

Decoupling contract: your functions take `html: string[]` — already-interpreted, fully self-contained HTML documents (inline styles, @font-face with absolute-resolvable URLs). The API layer composes interpreter + your renderer.

## Rules

- Owned paths: `core/src/render/**`. Touch nothing else (other agents work in parallel). No package.json edits — `playwright` and `fflate` are already installed; if something else is missing, append to `plans/swarm/NEEDS.md`.
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`.
- TypeScript strict, ESM, co-located vitest tests.
- Node-only module (this is server code).

## Task 1 — Browser lifecycle (`core/src/render/browser.ts`)

- Lazy singleton: `getBrowser(): Promise<Browser>` launching Playwright Chromium headless on first use; `closeBrowser(): Promise<void>`.
- Resilient: if the cached browser has disconnected, relaunch transparently.

## Task 2 — Screenshot (`core/src/render/screenshot.ts`)

`htmlToPng(html: string, opts?: {width?: number; height?: number}): Promise<Buffer>` (default 1080×1080)

- New page per call (pages are cheap; the browser is the expensive part), `setViewportSize`, `page.setContent(html, {waitUntil: 'networkidle'})` so @font-face fonts load, `deviceScaleFactor: 1` (context option — you may need a shared BrowserContext with fixed viewport/scale instead of bare pages), screenshot `{type:'png', clip: {x:0,y:0,width,height}}`, close the page in a finally block.
- Font URLs in the HTML may be `http://localhost:<port>/assets/fonts/...` (served by the API) — networkidle handles them. They may also be `file://` URLs; both must work (no special code needed, just don't block requests).

## Task 3 — Output directories (`core/src/render/output.ts`)

Port the old convention: runs live in `output/YYYY-MM-DD-N/` where N starts at 1 and increments per same-day run; never overwrite.

- `nextOutputDir(date: string, outputRoot?: string): string` — scans existing dirs, returns the next free absolute path (does not create it).
- `writeRun(dir, files: {name: string; data: Buffer | string}[]): Promise<void>` — mkdir -p then write all.
- Use an injectable `outputRoot` (default `<repo>/output`) so tests can point at a temp dir. There may be an existing `core/src/util/paths.ts` with the repo-root helper — reuse it if present, otherwise resolve relative to `process.cwd()`.

## Task 4 — Orchestration + ZIP (`core/src/render/index.ts`)

```ts
interface RenderedRun { dir: string; files: string[] }   // files: absolute paths, ['1.png', ...] order

renderSlides(html: string[], opts: {
  date: string;                       // YYYY-MM-DD
  slidesJson: unknown;                // written as slides.json (pretty-printed)
  caption?: string;                   // written as caption.txt when present
  outputRoot?: string;
  onProgress?: (done: number, total: number) => void;   // called after each PNG
}): Promise<RenderedRun>
```

- PNGs named `1.png` … `N.png` in slide order. Render sequentially (one page at a time) — predictable memory, progress events in order.
- `zipRun(dir: string): Promise<Buffer>` — ZIP of every file in the dir using `fflate` (`zipSync` is fine); returns the buffer (the API streams it as a download).
- Re-export everything (browser, screenshot, output, orchestration) from `core/src/render/index.ts`; make sure the core main entry (`core/src/index.ts`) re-exports the render module — add the export line there if it's missing (that one line in `core/src/index.ts` is the only file outside your dir you may touch).

## Task 5 — Tests

- `htmlToPng`: render `<html><body style="margin:0"><div style="width:1080px;height:1080px;background:#a2391a"></div></body></html>`, assert PNG magic bytes and dimensions 1080×1080 (parse IHDR width/height from the PNG header bytes directly — no image dep needed).
- `nextOutputDir`: empty root → `-1`; existing `-1`, `-2` → `-3`; other dates don't interfere. Use `fs.mkdtemp` temp roots.
- `renderSlides`: 2 small HTML docs → dir contains `1.png`, `2.png`, `slides.json`, `caption.txt`; progress callback fired twice.
- `zipRun`: unzip the buffer with fflate and assert the file names round-trip.
- If Chromium cannot launch in this environment, mark the browser-dependent tests with a skip-if guard (try launching once in a `beforeAll`, skip suite with a console warning on failure) and record the launch error in `plans/swarm/NEEDS.md` — but try hard first; Chromium was installed in Wave 0.

## Verify

`npx vitest run core/src/render` green; `tsc --noEmit` in core green.

## Final report

List files created, confirm whether Chromium-dependent tests ran for real (paste the PNG-dimension assertion result), and note anything added to NEEDS.md.

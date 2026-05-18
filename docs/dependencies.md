# Dependencies

Newspapper v2 targets a small dep footprint. The full list below.

**Versions are pinned exactly** (no `^` or `~`) in `package.json`. Upgrades are deliberate.

## Runtime

| Package | Used in | Why |
|---------|---------|-----|
| `rss-parser` | `scrape/rss.ts` | Parses RSS and Atom into a normalized item shape. Tiny, zero-config. |
| `better-sqlite3` | `storage/db.ts` | Synchronous SQLite. Matches the sequential, no-async-soup style of the CLI. |
| `satori` | `render/satori.ts` | JSX/HTML → SVG without a browser. Replaces Playwright and `@napi-rs/canvas`. |
| `@resvg/resvg-js` | `render/resvg.ts` | SVG → PNG. Native binary, ships prebuilt. |
| `react` | `render/slides/*.tsx` | Satori expects React-shaped JSX nodes. Used only as a node factory — no DOM, no hooks. |
| `dotenv` | `util/config.ts` | Loads `.env`. |
| `cac` | `cli.ts` | Tiny argv parser. Optional — could be hand-rolled. |

That's it for runtime deps. Seven packages.

## Dev

| Package | Why |
|---------|-----|
| `typescript` | Source language. |
| `tsx` | Fast `ts-node`-style runner for `npm run dev`. |
| `vitest` | Tests, co-located as `*.test.ts`. |
| `@types/node`, `@types/react` | Types for the runtime deps. |
| `eslint`, `prettier` | Lint and format. |

## What was dropped

| v1 package | Reason gone |
|------------|-------------|
| `playwright` | No headless-browser scraping; no browser-based rendering. |
| `@napi-rs/canvas` | Replaced by Satori + resvg. |
| `sharp` | No image post-processing step. |
| `cheerio` | RSS-only scraping; no HTML parsing. |
| `compromise` | No entity-extraction stage. |
| `inquirer` | No interactive menus. |
| `ora` | No spinners. |
| `handlebars` | The compose prompt is a single string template in code. |
| `openai` | Ollama-only. |
| `axios` | Native `fetch` is enough. |

## Native build requirements

- **`better-sqlite3`** — needs a C++ toolchain on install (`build-essential` on Debian/Ubuntu, Xcode CLT on macOS). Ships prebuilt binaries for common platforms; falls back to source build otherwise.
- **`@resvg/resvg-js`** — native, but distributes prebuilt binaries for all Tier-1 Node platforms. No toolchain needed in the common case.

No Python, no system libraries beyond `libc`.

# Commands

Newspapper exposes a single command. Subcommands exist only for inspection.

## `newspapper run`

Runs the full pipeline: scrape today's RSS feeds → compose a post via Ollama → render slides to PNG.

```bash
newspapper run
```

### Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `--max-per-source <n>` | `5` | Cap on articles taken from each source. Overrides `MAX_ARTICLES_PER_SOURCE`. |
| `--theme <name>` | `warm-industrial` | Design system to render with. Only `warm-industrial` ships today. |
| `--model <name>` | from `.env` | Override the Ollama model for this run. |
| `--dry-run` | off | Run scrape + compose, print the post JSON, skip rendering. |
| `--no-scrape` | off | Skip scraping; compose from whatever's already in the DB for today. |

### Behavior

1. **Scrape.** Each enabled source in `data/sources.json` is fetched as RSS. Items dated today (local time) are kept, up to `--max-per-source`. New articles are inserted into the `articles` table; URL collisions are skipped (dedupe).
2. **Compose.** All of today's articles are sent to Ollama in one prompt. The model returns a post: a title and 2–8 slide blocks. The post is written to the `posts` table.
3. **Render.** Each slide block is rendered through Satori (HTML/JSX → SVG) and then resvg (SVG → PNG) at 1080×1080. PNGs are written to `output/YYYY-MM-DD-N/` where `N` is the next available run number for that day. `slides.json` (the post payload) is written alongside.

### Re-runs

Running `newspapper run` twice on the same day produces two folders: `output/2026-05-18-1/` and `output/2026-05-18-2/`. Articles already seen are skipped during scrape, so the second run composes from any newly-published items plus whatever was already in the DB for today.

## `newspapper sources`

Lists sources from `data/sources.json` and pings each RSS feed to confirm it responds. Read-only.

## `newspapper list`

Shows recent posts from the DB (date, title, slide count, output path).

## `newspapper clean`

Deletes `output/` folders and DB rows older than `DEFAULT_RETENTION_DAYS` (default 30). Prompts before deleting.

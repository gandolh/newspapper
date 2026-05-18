# Configuration

## `.env`

Loaded by `src/util/config.ts`. Every variable has a sensible default — `.env` only exists to override.

| Variable | Default | Meaning |
|----------|---------|---------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL. |
| `OLLAMA_MODEL` | `llama3.2:1b` | Model passed in the `/api/generate` body. Bigger models give better posts. |
| `MAX_ARTICLES_PER_SOURCE` | `5` | Cap per source per scrape. |
| `USER_AGENT` | `Newspapper/2.0` | Sent on RSS HTTP requests. |
| `REQUEST_TIMEOUT` | `30000` | Milliseconds per RSS fetch. |
| `MAX_RETRIES` | `3` | Per-feed retry budget on network errors. |
| `THEME` | `warm-industrial` | Currently the only supported value. |
| `OUTPUT_DIR` | `./output` | Where versioned PNG folders go. |
| `DB_PATH` | `./data/newspapper.db` | SQLite file. Auto-created. |
| `DEFAULT_RETENTION_DAYS` | `30` | Used by `newspapper clean`. |

## `data/sources.json`

Hand-edited. RSS-only. See [data.md](data.md#datasourcesjson) for the schema.

Start small — three to five feeds is plenty. The composer prompt scales with article count, so very large feed lists slow the LLM down and dilute the post.

## One-time setup

```bash
# 1. Install deps
npm install

# 2. Run Ollama (either natively or via the shipped docker-compose)
docker compose -f newspaper-infra/docker-compose.yml up -d
# or: ollama serve

# 3. Pull the model
ollama pull llama3.2:1b

# 4. Drop your sources into data/sources.json
# 5. Try it
npm start -- run
```

That's the whole setup. No Playwright browsers to install, no Python build deps for Sharp, no API keys.

## npm scripts

| Script | Does |
|--------|------|
| `npm run build` | `tsc` to `dist/` |
| `npm start` | runs `dist/cli.js` — forward args with `--` |
| `npm run dev` | `tsx src/cli.ts` for fast iteration |
| `npm test` | `vitest` |
| `npm run lint` | `eslint src/` |
| `npm run fmt` | `prettier --write src/` |

There are no convenience aliases per pipeline stage (`scrape`, `compose`, `render`) because the user-facing surface is just `run`.

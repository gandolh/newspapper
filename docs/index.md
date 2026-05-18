# Wiki Index

Documentation for Newspapper v2. Maintained by Claude Code sessions.

## What this project is

A minimal CLI that turns today's news into an Instagram-style slide post.

```
sources.json (RSS)  →  scrape  →  compose (Ollama)  →  render (Satori → PNG)
                                                      └→ output/YYYY-MM-DD-N/
```

One command — `newspapper run` — does the whole pipeline. No human-in-the-loop.

## Pages

| Page | Description |
|------|-------------|
| [commands.md](commands.md) | CLI reference for `newspapper run` and its flags |
| [architecture.md](architecture.md) | Three-stage pipeline, module layout, key constraints |
| [data.md](data.md) | SQLite schema, sources.json shape, post JSON shape |
| [modules.md](modules.md) | Module APIs: scraper, composer, renderer, storage |
| [configuration.md](configuration.md) | Env vars, sources.json, Ollama setup |
| [design-systems.md](design-systems.md) | warm-industrial theme spec |
| [dependencies.md](dependencies.md) | npm packages and rationale |

## Maintenance

This wiki is maintained by Claude Code. When making changes, update the relevant pages and append a line to [log.md](log.md). See `CLAUDE.md` for the schema.

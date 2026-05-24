# Newspapper

A minimal CLI that turns today's news into an Instagram-style slide post.

```
sources.json (RSS)  →  scrape  →  compose (Ollama)  →  render (Satori → PNG)
```

One command — `newspapper run` — does the whole pipeline. No menus, no human-in-the-loop, no cloud services.

## Prerequisites

- **Node.js** v18+
- **Ollama** running locally (`ollama serve`, or the shipped docker-compose)

## Install

```bash
npm install
docker compose -f infra/docker-compose.yml up -d   # or `ollama serve`
ollama pull llama3.2:1b
cp .env.example .env                                          # tweak as needed
```

## Configure sources

Edit `data/sources.json`. RSS feeds only:

```json
[
  {
    "id": "bbc-world",
    "name": "BBC World",
    "rss": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "enabled": true
  }
]
```

## Run

```bash
npm start -- run
```

Today's RSS items get scraped (max 5 per source by default), Ollama composes a single Instagram-style post with 2–8 slides, and Satori renders each slide to a 1080×1080 PNG.

Output lands in `output/YYYY-MM-DD-N/`:

```
output/2026-05-18-1/
├── slides.json
├── 1.png
├── 2.png
└── …
```

Re-running on the same day writes to `-2`, `-3`, etc. — nothing is overwritten.

## Other commands

```bash
newspapper sources   # list and ping configured feeds
newspapper list      # show recent posts
newspapper clean     # delete old runs + DB rows
```

## Theme

One theme ships: `warm-industrial`. Soft brutalism, terracotta accent, Inter at six weights. Tokens live in `assets/design-systems/warm-industrial.json`; reference HTML in `assets/templates/warm-industrial/`.

## Documentation

Full docs in [`docs/`](docs/index.md):

- [commands.md](docs/commands.md) — CLI reference
- [architecture.md](docs/architecture.md) — pipeline and module layout
- [data.md](docs/data.md) — SQLite schema and post JSON shape
- [modules.md](docs/modules.md) — module APIs
- [configuration.md](docs/configuration.md) — env vars and setup
- [design-systems.md](docs/design-systems.md) — warm-industrial theme
- [dependencies.md](docs/dependencies.md) — what's installed and why

## License

MIT

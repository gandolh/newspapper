# Newspapper v3

A local web app that turns today's RSS news into an Instagram-style slide post (1080×1080 PNGs).

```
RSS feeds  →  scrape  →  compose (Ollama)  →  edit  →  render (Chromium)  →  ZIP
```

Browser wizard at `http://localhost:4321`. No CLI, no cloud services (except optional Ollama Cloud).

## Prerequisites

- **Node.js** v20+
- **Ollama** running locally (`ollama serve` or the shipped docker-compose)

## Quick start

```bash
# 1. Install
npm install
npx playwright install chromium

# 2. Start Ollama and pull a model
ollama serve                          # or: docker compose -f infra/docker-compose.yml up -d
ollama pull llama3.2:1b

# 3. Configure (optional — defaults work out of the box)
cp .env.example .env

# 4. Run
npm run dev
# open http://localhost:4321
```

## Usage

Open `http://localhost:4321` and follow the four-step wizard:

1. **Scrape** — fetch today's RSS articles (configure feeds in the Sources page)
2. **Compose** — Ollama drafts a 2–8 slide post from the articles
3. **Edit** — review and tweak each slide with AI assistance
4. **Export** — render 1080×1080 PNGs and download as ZIP

## Theme

One theme ships: `warm-industrial`. Soft brutalism, terracotta accent (`#a2391a`), Inter typeface. JSON templates in `assets/templates/warm-industrial/`, editable in the visual Builder.

## Documentation

Full docs in [`docs/`](docs/index.md):

- [commands.md](docs/commands.md) — npm scripts and ports
- [architecture.md](docs/architecture.md) — monorepo layout and pipeline
- [api.md](docs/api.md) — HTTP route table
- [data.md](docs/data.md) — SQLite schema and data formats
- [modules.md](docs/modules.md) — core library APIs
- [configuration.md](docs/configuration.md) — env vars and setup
- [design-systems.md](docs/design-systems.md) — warm-industrial theme and template system
- [dependencies.md](docs/dependencies.md) — package list per workspace

## License

MIT

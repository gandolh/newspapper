# Configuration

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

```bash
# OpenAI (optional — only needed for --method=llm)
OPENAI_API_KEY=sk-...

# Ollama (optional — only needed for --method=local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Scraping
SCRAPING_TIMEOUT=30000        # ms
SCRAPING_RETRIES=3
SCRAPING_USER_AGENT=Newspapper/1.0

# Clustering
CLUSTERING_THRESHOLD=0.75
CLUSTERING_MIN_GROUP_SIZE=2

# Image generation
IMAGE_QUALITY=90
IMAGE_FORMAT=png
IMAGE_WIDTH=1080
IMAGE_HEIGHT=1080

# Data retention
DATA_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info                # debug | info | warn | error
```

## Adding News Sources

Edit `data/sources.json`. Each source object:

```json
{
  "id": "unique-source-id",
  "name": "Display Name",
  "url": "https://example.com",
  "rss": "https://example.com/rss",
  "scraperType": "http",
  "enabled": true,
  "selectors": {
    "title": "h1.headline",
    "author": ".author-name",
    "date": "time[datetime]",
    "body": "article .content"
  }
}
```

- `scraperType`: `http` (only supported type)
- `rss`: optional; if present, RSS is tried first before HTML scraping
- `selectors`: CSS selectors for extracting content; used by HTTP scraper
- `enabled`: set to `false` to skip without removing the source

## One-Time Setup

```bash
# Install npm dependencies
npm install

# Install and start Ollama (required for --method=local summarization)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:1b
ollama serve
```

## Design System Selection

Pass `--design=broadsheet` (default) or `--design=industrial` to `npm run format`.

Design configs live in `design-systems/digital-broadsheet.yaml` and `design-systems/warm-industrial.yaml`. HTML templates in `templates/{design}/`. See [design-systems.md](design-systems.md) for visual specs.

## Soul Definition

The tone and personality of the generated content is controlled by a single file: `soul.md` in the project root. This file defines the identity, voice, and constraints for the AI summarizer. No other parameters are used.

## npm Scripts

```bash
npm run scrape               # Scrape articles
npm run group                # Cluster articles
npm run extract-entities     # Extract named entities
npm run query-entities       # Search by entity
npm run summarize <id>       # Generate slides
npm run generate <id>        # Render images
npm run export <id>          # Export package
npm run clean                # Delete old data
npm run list                 # List items

npm test                     # Run tests (vitest)
npm run test:watch           # Watch mode
npm run lint                 # ESLint
npm run format               # Prettier
npm run build                # TypeScript compilation
```

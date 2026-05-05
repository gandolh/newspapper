# Newspapper

Personal news aggregation and summarization tool that generates Instagram-ready slides from trusted news sources.

## Features

- **Multi-source scraping:** HTTP, Playwright (JS-heavy sites), and RSS feed support
- **Smart grouping:** Cluster similar articles using embeddings or entity extraction
- **Flexible summarization:** Local LLM (Ollama), OpenAI API, or template-based
- **Beautiful slides:** Two design systems (Digital Broadsheet, Warm Industrial)
- **Entity tracking:** Extract and query people, places, organizations, and events
- **Manual control:** Every step requires explicit user command

## Prerequisites

- **Node.js** v18 or higher
- **Ollama** (for local LLM) - [Installation guide](https://ollama.com)
- **Playwright browsers:** `npx playwright install chromium`

## Installation

```bash
# Clone or navigate to project
cd newspapper

# Install dependencies (already done if you're reading this)
npm install

# Install Playwright browser
npx playwright install chromium

# Install Ollama and pull model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:1b

# Copy environment file
cp .env.example .env
# Edit .env and add your OpenAI API key if using API summarization
```

## Quick Start

1. **Add news sources** - Edit `data/sources.json`:
```json
[
  {
    "id": "example-news",
    "name": "Example News",
    "url": "https://example.com",
    "rss": "https://example.com/rss",
    "scraperType": "http",
    "enabled": true,
    "selectors": {
      "title": "h1",
      "author": ".author",
      "date": "time",
      "body": "article"
    }
  }
]
```

2. **Scrape articles:**
```bash
npm run scrape
```

3. **Group similar articles:**
```bash
npm run group
```

4. **Summarize a group:**
```bash
npm run summarize <group-id> --method=local --tone=analytical
```

5. **Generate images:**
```bash
npm run generate <group-id>
```

6. **Export package:**
```bash
npm run export <group-id>
```

## CLI Commands

### Scraping
```bash
npm run scrape [--sources=source1,source2]
```

### Grouping
```bash
npm run group [--threshold=0.75] [--method=embeddings|entities]
```

### Entity Extraction
```bash
npm run extract-entities <article-id> [--method=compromise|transformers]
npm run extract-entities --all
```

### Entity Search
```bash
npm run query-entities --type=person --name="Biden" [--days=30]
```

### Summarization
```bash
npm run summarize <group-id> \
  --method=llm|local|nlp \
  --tone=optimistic|analytical \
  --design=broadsheet|industrial \
  [--max-slides=8] \
  [--emphasis="key point"]
```

### Image Generation
```bash
npm run generate <group-id>
```

### Export
```bash
npm run export <group-id> [--destination=/path/to/export]
```

### Maintenance
```bash
npm run list [--type=articles|groups|summaries] [--status=scraped|grouped|published]
npm run clean [--older-than=30d] [--status=published] [--dry-run]
```

## Design Systems

### Digital Broadsheet
Classic newspaper aesthetic with serif typography (Newsreader), sharp corners, and newsprint colors. Emphasizes authority and archival permanence.

### Warm Industrial
Soft brutalism with rounded corners, bold sans-serif (Epilogue/Manrope), and terracotta accents. Tactile and grounded feel.

## Configuration

Edit `.env` to configure:
- OpenAI API key
- Ollama host and model
- Scraping settings (timeout, retries)
- Image quality and format
- Data retention period

## Project Structure

```
newspapper/
├── src/
│   ├── commands/       # CLI command handlers
│   ├── scrapers/       # HTTP, Playwright, RSS
│   ├── nlp/           # Entities, embeddings, clustering
│   ├── summarizers/   # LLM, local, template
│   ├── renderer/      # HTML builder, screenshot
│   ├── storage/       # Manifest, articles, groups
│   └── utils/         # Logger, config
├── data/              # JSON storage
├── output/            # Generated images
├── design-systems/    # YAML configs
├── prompts/           # Handlebars templates
└── templates/         # HTML slide templates
```

## Workflow Example

```bash
# 1. Scrape from all enabled sources
npm run scrape

# 2. Group similar articles
npm run group --threshold=0.75

# 3. Extract entities for historical tracking
npm run extract-entities --all

# 4. Summarize a specific group
npm run summarize abc-123 --method=local --tone=analytical --design=broadsheet

# 5. Generate slide images
npm run generate abc-123

# 6. Export for publishing
npm run export abc-123

# 7. Clean old data
npm run clean --older-than=30d --status=published
```

## Troubleshooting

### Ollama connection refused
```bash
# Start Ollama service
ollama serve

# Verify it's running
curl http://localhost:11434/api/version
```

### Playwright installation fails
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install libgbm1 libnss3 libatk-bridge2.0-0

# Then reinstall
npx playwright install chromium
```

### Sharp build fails
```bash
# Install build tools (Ubuntu/Debian)
sudo apt-get install build-essential python3

# Reinstall
npm rebuild sharp
```

## Documentation

See `docs/` directory for detailed documentation:
- `architecture.md` - System architecture and design decisions
- `cli-commands.md` - Complete CLI reference
- `design-systems.md` - Design system specifications
- `dependencies.md` - Dependency list and rationale

## License

MIT

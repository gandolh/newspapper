# Newspapper

Personal news aggregation and summarization tool that generates Instagram-ready slides from trusted news sources.

## Features

- **Multi-source scraping:** HTTP, Playwright (JS-heavy sites), and RSS feed support
- **SQLite database:** Persistent storage for articles and extracted entities
- **Daily organization:** Raw articles organized by date and source in directory structure
- **Automatic entity extraction:** NLP-based extraction of people, places, organizations, events
- **Smart grouping:** Cluster similar articles using embeddings or entity extraction
- **Flexible summarization:** Local LLM (Ollama), OpenAI API, or template-based
- **Beautiful slides:** Two design systems (Digital Broadsheet, Warm Industrial)
- **Entity tracking:** Query and track entities across articles and time
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

2. **Scrape articles (with automatic entity extraction):**

```bash
npm run scrape
```

- Articles are saved to `data/raw-articles/YYYY-MM-DD/source-id/`
- Entities are automatically extracted and stored in SQLite database

3. **List articles and entities:**

```bash
npm run list --type=articles
npm run list --type=entities
```

4. **Query entities:**

```bash
npm run query-entities --type=person --name="Biden" --days=30
```

5. **Group similar articles:**

```bash
npm run group
```

6. **Summarize a group:**

```bash
npm run summarize <group-id> --method=local --tone=analytical
```

7. **Generate images:**

```bash
npm run generate <group-id>
```

8. **Export package:**

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
npm run query-entities --type=person --name="Biden" [--days=30] [--timeline]
# Types: person, place, organization, event
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
npm run list --type=articles [--status=scraped] [--source=example-news]
npm run list --type=entities [--status=person]
npm run list --type=groups
npm run list --type=summaries
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
│   ├── storage/       # SQLite database, JSON files
│   └── utils/         # Logger, config
├── data/
│   ├── raw-articles/  # Daily organized JSON files (YYYY-MM-DD/source-id/)
│   ├── newspapper.db  # SQLite database with articles and entities
│   └── sources.json   # News source configuration
├── output/            # Generated images
├── design-systems/    # YAML configs
├── prompts/           # Handlebars templates
└── templates/         # HTML slide templates
```

## Workflow Example

```bash
# 1. Scrape from all enabled sources (automatic entity extraction)
npm run scrape

# 2. Browse collected articles and entities
npm run list --type=articles
npm run list --type=entities

# 3. Query specific entities across articles
npm run query-entities --type=person --name="Biden" --days=30 --timeline

# 4. Group similar articles
npm run group --threshold=0.75

# 5. Summarize a specific group
npm run summarize abc-123 --method=local --tone=analytical --design=broadsheet

# 6. Generate slide images
npm run generate abc-123

# 7. Export for publishing
npm run export abc-123

# 8. Clean old data
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

## New Architecture

The application now uses a **dual storage system**:

- **SQLite Database** (`data/newspapper.db`): Stores article metadata and extracted entities with full search capabilities
- **Raw JSON Files** (`data/raw-articles/YYYY-MM-DD/source-id/`): Complete article content organized by date and source

**Entity Extraction** happens automatically during scraping:

- **People**: Names and persons mentioned
- **Places**: Geographic locations
- **Organizations**: Companies, institutions, governments
- **Events**: Elections, conferences, conflicts, etc.

**Key Benefits**:

- Fast entity queries across all articles
- Historical tracking of entities over time
- Daily organization for easy backup and analysis
- Persistent storage with SQLite reliability

## Documentation

See `docs/` directory for detailed documentation:

- `architecture.md` - System architecture and design decisions
- `cli-commands.md` - Complete CLI reference
- `design-systems.md` - Design system specifications
- `dependencies.md` - Dependency list and rationale

## License

MIT

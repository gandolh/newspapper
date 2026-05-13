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

# Login to Ollama before starting to use it from the app
ollama login

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

2. **Start the application:**

```bash
npm start
```

- This launches the interactive menu where you can:
  - **Scrape articles**: Fetches today's news and saves them to SQLite.
  - **Extract entities**: Identifies people, places, and organizations.
  - **Format post**: Uses Ollama to generate a post preview and slides based on selected entities.
  - **Generate slides**: Renders the approved post into high-quality images.
  - **List items**: Browse articles, entities, and posts.
  - **Clean data**: Manage database size by removing old records.

- Articles are saved to `data/raw-articles/YYYY-MM-DD/source-id/`
- Entities and metadata are stored in the SQLite database.

## Interactive Menu Options

The application uses a single entry point (`npm start`) with the following options:

### Scrape Articles

Fetches today's articles from enabled sources in `data/sources.json`. It filters for today's date and deduplicates by URL.

### Extract Entities

Processes articles with status `scraped` to identify and link entities (People, Places, Orgs, Events).

### Format Post

Interactive REPL to build a social media post. Requires Ollama to be running. You provide entity names, and it generates a preview for your feedback before finalizing slides.

### Generate Slides

Select a formatted post to render into images. Uses `@napi-rs/canvas` and Sharp for high-quality output.

### List Items

View articles, entities, or posts in a tabular format.

### Clean Data

Remove old database records and post directories (default: older than 30 days).

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
# 1. Start the app
npm start

# 2. Select "Scrape articles"
# 3. Select "Extract entities"
# 4. Select "Format post" -> Enter entities (e.g., "Biden, NATO")
# 5. Select "Generate slides" -> Pick the post you just formatted
# 6. Select "Clean data" (optional)
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
- `commands.md` - Interactive menu options reference
- `design-systems.md` - Design system specifications
- `dependencies.md` - Dependency list and rationale

## License

MIT

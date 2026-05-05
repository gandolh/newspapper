# Dependencies

## Production Dependencies

### Core Runtime
- **Node.js** - v18+ (LTS recommended)
  - Required for ES modules, async/await, and modern JavaScript features

### HTTP & Web Scraping
- **axios** - `^1.6.0`
  - HTTP client for making requests to news sources
  - Used for: RSS feeds, simple HTML fetching

- **cheerio** - `^1.0.0-rc.12`
  - Fast, flexible HTML parsing (jQuery-like API)
  - Used for: extracting content from scraped pages

- **playwright** - `^1.40.0`
  - Headless browser automation
  - Used for: JavaScript-heavy sites, screenshot rendering
  - Note: Downloads browser binaries (~300MB per browser)

- **rss-parser** - `^3.13.0`
  - Parse RSS/Atom feeds
  - Used for: discovering articles from RSS feeds

### NLP & Machine Learning
- **compromise** - `^14.10.0`
  - Lightweight NLP library for entity extraction
  - Used for: fast entity extraction (people, places, organizations)
  - Note: Rule-based, no model downloads required

- **@xenova/transformers** - `^2.10.0`
  - Transformers.js - run transformer models in Node.js
  - Used for: sentence embeddings, advanced NER
  - Note: Downloads models on first use (~100-500MB depending on model)

### LLM Integration
- **ollama** - `^0.5.0` (or use HTTP client)
  - Ollama JavaScript client
  - Used for: local LLM communication (Llama 3.2 1B)
  - Note: Requires Ollama installed separately

- **openai** - `^4.20.0`
  - OpenAI API client
  - Used for: cloud LLM summarization (optional)

### Templating & Rendering
- **handlebars** - `^4.7.8`
  - Template engine
  - Used for: prompt templates, HTML slide templates

### Image Processing
- **sharp** - `^0.33.0`
  - High-performance image processing
  - Used for: PNG compression, format conversion
  - Note: Native module, requires build tools

### CLI & User Interface
- **commander** - `^11.1.0`
  - Command-line interface framework
  - Used for: parsing CLI arguments, subcommands

- **inquirer** - `^9.2.0`
  - Interactive CLI prompts
  - Used for: group review, confirmation dialogs

- **chalk** - `^5.3.0`
  - Terminal string styling
  - Used for: colored output, formatting

- **ora** - `^7.0.1`
  - Terminal spinners
  - Used for: progress indicators during scraping/processing

- **cli-table3** - `^0.6.3`
  - Pretty tables for terminal
  - Used for: listing articles, groups, summaries

### Utilities
- **uuid** - `^9.0.1`
  - Generate unique identifiers
  - Used for: article IDs, group IDs, summary IDs

- **dotenv** - `^16.3.1`
  - Load environment variables from .env
  - Used for: API keys, configuration

- **js-yaml** - `^4.1.0`
  - YAML parser
  - Used for: reading design system configs

- **date-fns** - `^3.0.0`
  - Date utility library
  - Used for: date formatting, age calculations

- **lodash** - `^4.17.21`
  - Utility library
  - Used for: array/object manipulation, debouncing

### Vector Operations
- **ml-distance** - `^4.0.1`
  - Distance/similarity calculations
  - Used for: cosine similarity for clustering

---

## Development Dependencies

### Testing
- **jest** - `^29.7.0`
  - Testing framework
  - Used for: unit tests, integration tests

- **@types/jest** - `^29.5.0`
  - TypeScript types for Jest (if using JSDoc)

### Code Quality
- **eslint** - `^8.55.0`
  - JavaScript linter
  - Used for: code quality, style enforcement

- **prettier** - `^3.1.0`
  - Code formatter
  - Used for: consistent code formatting

### Build Tools
- **nodemon** - `^3.0.2`
  - Auto-restart on file changes
  - Used for: development workflow

---

## Optional Dependencies

### Advanced NLP (if using transformers heavily)
- **onnxruntime-node** - `^1.16.0`
  - ONNX runtime for faster inference
  - Used for: accelerating transformer models

### Database (if scaling beyond file-based)
- **better-sqlite3** - `^9.2.0`
  - Fast SQLite3 bindings
  - Used for: manifest as SQLite database (future optimization)

---

## System Requirements

### Required
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Disk space:** 2-5GB (for models, browser binaries, data)
- **RAM:** 4GB minimum, 8GB recommended

### Optional (for local LLM)
- **Ollama** - Latest version
  - Install: `curl -fsSL https://ollama.com/install.sh | sh`
  - Pull model: `ollama pull llama3.2:1b`
  - Disk space: ~1GB per model

### Build Tools (for native modules)
- **Linux:** `build-essential`, `python3`
- **macOS:** Xcode Command Line Tools
- **Windows:** Visual Studio Build Tools

---

## Installation Commands

### Install Ollama (Local LLM)
```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Pull Llama 3.2 1B model
ollama pull llama3.2:1b
```

### Install Node.js Dependencies
```bash
# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

---

## Estimated Sizes

### npm Packages
- Production dependencies: ~150MB
- Development dependencies: ~50MB
- Total node_modules: ~200MB

### External Downloads
- Playwright Chromium: ~300MB
- @xenova/transformers models: ~100-500MB (on first use)
- Ollama + Llama 3.2 1B: ~1GB

### Total Disk Usage
- Initial: ~500MB
- With models: ~1.5-2GB
- With data (100 articles): ~2-3GB

---

## Package.json Scripts

```json
{
  "scripts": {
    "scrape": "node src/commands/scrape.js",
    "group": "node src/commands/group.js",
    "extract-entities": "node src/commands/extract-entities.js",
    "query-entities": "node src/commands/query-entities.js",
    "summarize": "node src/commands/summarize.js",
    "generate": "node src/commands/generate.js",
    "export": "node src/commands/export.js",
    "clean": "node src/commands/clean.js",
    "list": "node src/commands/list.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

---

## Environment Variables (.env)

```bash
# OpenAI API (optional)
OPENAI_API_KEY=sk-...

# Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Application settings
NODE_ENV=development
LOG_LEVEL=info

# Scraping settings
USER_AGENT=Newspapper/1.0
REQUEST_TIMEOUT=30000
MAX_RETRIES=3

# Clustering settings
DEFAULT_SIMILARITY_THRESHOLD=0.75
MIN_GROUP_SIZE=2

# Image generation
IMAGE_FORMAT=png
IMAGE_QUALITY=90
IMAGE_SIZE=1080x1080

# Data retention
DEFAULT_RETENTION_DAYS=30
```

---

## Dependency Rationale

### Why Playwright over Puppeteer?
- Better cross-browser support
- More modern API
- Better TypeScript support
- Active development

### Why compromise over spaCy?
- Pure JavaScript (no Python dependency)
- Lightweight (~2MB vs ~500MB)
- Fast enough for our use case
- Easy to install

### Why @xenova/transformers?
- Runs in Node.js without Python
- Uses ONNX models (fast inference)
- No GPU required
- Good model selection

### Why file-based storage over database?
- Simpler setup (no migrations)
- Easy to inspect and debug
- Version control friendly
- Sufficient for expected scale

### Why Ollama over other local LLM solutions?
- Easy installation
- Good model selection
- Simple API
- Active community

---

## Potential Issues & Solutions

### Issue: Playwright installation fails
**Solution:** Install system dependencies
```bash
# Ubuntu/Debian
sudo apt-get install libgbm1 libnss3 libatk-bridge2.0-0

# macOS
# Usually works out of the box

# Windows
# Install Visual C++ Redistributable
```

### Issue: sharp installation fails
**Solution:** Install build tools
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install

# Windows
npm install --global windows-build-tools
```

### Issue: @xenova/transformers model download fails
**Solution:** Manual download or use cache
```bash
# Set cache directory
export HF_HOME=/path/to/cache

# Or download manually and place in cache
```

### Issue: Ollama connection refused
**Solution:** Start Ollama service
```bash
# Linux/macOS
ollama serve

# Or check if running
curl http://localhost:11434/api/version
```

---

## Alternative Lightweight Options

If disk space or installation is an issue:

### Minimal Setup (No ML)
Remove:
- `@xenova/transformers` (use only compromise)
- `playwright` (use only axios + cheerio)
- `ollama`/`openai` (use only template-based summarization)

**Savings:** ~1.5GB disk space

### Cloud-Only Setup (No Local LLM)
Remove:
- `ollama` package
- Ollama installation

Use only OpenAI API for summarization

**Savings:** ~1GB disk space

### Headless Setup (No Image Generation)
Remove:
- `playwright`
- `sharp`

Generate only text summaries, no images

**Savings:** ~400MB disk space

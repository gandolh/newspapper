# Newspapper - Project Overview

## What This Project Does

Newspapper is a CLI-based news aggregation and summarization tool that:

1. Scrapes articles from trusted news sources
2. Groups similar articles using AI embeddings or entity extraction
3. Generates Instagram-ready slide summaries using LLMs
4. Renders beautiful slides in two design systems
5. Exports packages ready for social media publishing

## Current Status

**Bootstrap Phase: COMPLETE ✅**

All core modules, templates, and documentation are in place. The project structure is fully scaffolded.

**Implementation Phase: PENDING ⏳**

CLI command handlers need implementation. See `docs/todos/` for detailed guides.

## Architecture Overview

### Data Flow

```
Sources (JSON) → Scraper → Articles (JSON)
                              ↓
                         Clustering → Groups (JSON)
                              ↓
                         Summarizer → Summary (JSON)
                              ↓
                         Renderer → Images (PNG)
                              ↓
                         Export → Package
```

### Storage Strategy

- **File-based JSON storage** (no database)
- **Manifest index** (`data/manifest.json`) tracks all items and their states
- **Status workflow**: scraped → grouped → summarized → generated → published

### Module Organization

1. **Storage** (`src/storage/`)
   - Manifest manager (central index)
   - Article, group, summary, entity, source managers
   - All handle JSON file I/O and manifest updates

2. **Scrapers** (`src/scrapers/`)
   - HTTP scraper (axios + cheerio)
   - Playwright scraper (JS-heavy sites)
   - RSS parser
   - Orchestrator with fallback logic

3. **NLP** (`src/nlp/`)
   - Entity extractor (compromise/transformers)
   - Embedding generator (@xenova/transformers)
   - Article clusterer (similarity-based grouping)

4. **Summarizers** (`src/summarizers/`)
   - LLM summarizer (OpenAI API)
   - Local summarizer (Ollama)
   - Template summarizer (rule-based, no LLM)
   - Orchestrator for method selection

5. **Renderer** (`src/renderer/`)
   - Design loader (YAML configs)
   - HTML builder (Handlebars templates)
   - Screenshot renderer (Playwright + Sharp)

6. **Commands** (`src/commands/`) - **TO BE IMPLEMENTED**
   - 9 CLI commands (see todos)
   - Each uses storage and processing modules

## Key Design Decisions

### Why File-Based Storage?

- Transparency: Users can inspect/edit JSON files
- Simplicity: No database setup required
- Portability: Easy to backup/transfer
- Git-friendly: Can version control data

### Why Multiple Summarization Methods?

- **LLM (OpenAI)**: Best quality, costs money
- **Local (Ollama)**: Free, runs offline, requires GPU
- **Template**: Fallback, no AI needed, basic quality

### Why Two Design Systems?

- **Digital Broadsheet**: Professional, news-focused
- **Warm Industrial**: Modern, social media-friendly
- Users can choose based on audience/platform

### Why Manual Control?

- No automatic posting/publishing
- User reviews every step (groups, summaries, images)
- Prevents AI errors from reaching production

## Technology Stack

**Runtime**: Node.js v18+ (ES modules, TypeScript 5.5.4)

**Dev Tooling**:

- `typescript@5.5.4` - Type checking, compiled to `dist/`
- `vitest` - Test runner (tests co-located: `src/**/*.test.ts`)
- `eslint@8.57` + `@typescript-eslint@7.18` - Linting (flat config)
- `prettier` - Formatting

**Core Dependencies**:

- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `ora` - Progress spinners
- `chalk` - Colored output
- `cli-table3` - Table formatting

**Scraping**:

- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `playwright` - Browser automation
- `rss-parser` - RSS/Atom feeds

**NLP/AI**:

- `compromise` - Fast entity extraction
- `@xenova/transformers` - Embeddings (local)
- `ollama` - Local LLM client
- `openai` - OpenAI API client

**Rendering**:

- `handlebars` - HTML templating
- `js-yaml` - Design system configs
- `sharp` - Image compression

## File Structure

```
newspapper/
├── .claude/              # AI assistant context (this directory)
├── data/                 # JSON storage
│   ├── articles/         # Individual article files
│   ├── groups/           # Article group files
│   ├── summaries/        # Summary files
│   ├── entities/         # Extracted entity files
│   ├── sources.json      # News source configuration
│   └── manifest.json     # Central index
├── output/               # Generated images
│   └── {group-id}/
│       ├── slides/       # PNG images
│       └── metadata.json
├── src/
│   ├── commands/         # CLI handlers (TO IMPLEMENT)
│   ├── scrapers/         # Web scraping modules ✅
│   ├── nlp/             # NLP and clustering ✅
│   ├── summarizers/     # Summary generation ✅
│   ├── renderer/        # Image rendering ✅
│   ├── storage/         # Data persistence ✅
│   ├── utils/           # Logger, config ✅
│   └── index.js         # CLI entry point ✅
├── design-systems/       # YAML design configs ✅
├── prompts/             # Handlebars LLM prompts ✅
├── templates/           # HTML slide templates ✅
│   ├── digital-broadsheet/
│   └── warm-industrial/
└── docs/
    ├── todos/           # Implementation guides ✅
    ├── architecture.md  # System design ✅
    ├── cli-commands.md  # Command reference ✅
    ├── design-systems.md # Visual specs ✅
    └── dependencies.md  # Package rationale ✅
```

## What's Complete

✅ All storage modules with full CRUD operations
✅ All scraper implementations with fallback logic
✅ NLP modules (entity extraction, embeddings, clustering)
✅ All three summarization methods
✅ Renderer with both design systems
✅ 8 HTML slide templates (4 types × 2 designs)
✅ Complete documentation suite
✅ Detailed TODO guides for all 9 commands

## What Needs Implementation

⏳ 8 CLI command handlers remaining in `src/commands/`:

1. ✅ `scrape.js` - Orchestrate scraping
2. `group.js` - Interactive clustering
3. `extract-entities.js` - Entity extraction
4. `query-entities.js` - Entity search
5. `summarize.js` - Summary generation
6. `generate.js` - Image rendering
7. `export.js` - Package export
8. `clean.js` - Data cleanup
9. `list.js` - Item listing

Each has a detailed implementation guide in `docs/todos/`.

## Development Workflow

1. Implement commands in priority order (see `docs/todos/README.md`)
2. Test each command independently
3. Run full workflow: scrape → group → summarize → generate → export
4. Iterate on design systems and prompts

## Testing Strategy

- Start with template summarizer (no LLM needed)
- Use 1-2 news sources initially
- Test with small article sets
- Verify file outputs in `data/` and `output/`
- Use `--dry-run` flags where available

## Common Patterns

All commands should:

- Load manifest at start
- Use ora spinners for long operations
- Use inquirer for user input
- Log with the logger utility
- Handle errors gracefully
- Update manifest on completion

## Important Notes

- **CSS lint errors in templates are expected** - Handlebars variables cause linter errors but work at runtime
- **Ollama must be running** for local summarization
- **Playwright browser** must be installed for rendering
- **All operations are synchronous** - no background jobs
- **User reviews everything** - no automatic publishing

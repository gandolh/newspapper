# Bootstrap Notes

## Project Status

The Newspapper project has been successfully bootstrapped with the following structure:

### ✅ Completed

1. **Package Configuration**
   - `package.json` with all dependencies
   - `.env.example` for configuration
   - `.gitignore` for version control

2. **Core Modules**
   - Storage layer (manifest, articles, groups, summaries, entities, sources)
   - Scrapers (HTTP, Playwright, RSS)
   - NLP (entity extraction, embeddings, clustering)
   - Summarizers (LLM, local, template-based)
   - Renderer (HTML builder, screenshot generator)

3. **Design Systems**
   - Digital Broadsheet YAML config
   - Warm Industrial YAML config
   - HTML templates for both systems (title, body, quote, image-caption)

4. **Configuration**
   - Prompt templates (LLM, local, template)
   - Design system YAML files
   - Initial data files (sources.json, manifest.json)

5. **Documentation**
   - README.md with quick start guide
   - architecture.md with system design
   - cli-commands.md with command reference
   - design-systems.md with visual specifications
   - dependencies.md with package rationale

6. **CLI Entry Point**
   - Main CLI router (`src/index.js`)

### ⚠️ TODO: Command Implementations

The CLI commands are defined but need implementation. Each command file in `src/commands/` needs to be created:

1. **scrape.js** - Implement article scraping logic
2. **group.js** - Implement clustering with interactive TUI
3. **extract-entities.js** - Implement entity extraction
4. **query-entities.js** - Implement entity search
5. **summarize.js** - Implement summarization with preview
6. **generate.js** - Implement image generation
7. **export.js** - Implement export functionality
8. **clean.js** - Implement cleanup with confirmation
9. **list.js** - Implement listing with formatting

### Next Steps

1. **Create Command Implementations**
   - Start with `scrape.js` as it's the entry point
   - Then `group.js` for clustering
   - Follow the workflow order

2. **Test Each Command**
   - Add a test news source to `data/sources.json`
   - Run through the complete workflow
   - Verify file outputs

3. **Add Error Handling**
   - Graceful failures
   - User-friendly error messages
   - Retry logic where appropriate

4. **Enhance Interactive Features**
   - Use `inquirer` for group review
   - Add progress bars with `ora`
   - Format tables with `cli-table3`

### Known Issues

- **CSS Lint Errors in Templates**: These are expected - Handlebars variables like `{{colors.surface}}` cause CSS linter errors but will resolve when templates are rendered
- **Command Files Missing**: The CLI router is complete but individual command handlers need implementation

### Architecture Decisions

- **File-based storage** over database for simplicity and transparency
- **Dual strategies** for scraping, NLP, and summarization for flexibility
- **Manual control** at every step to maintain user oversight
- **Modular design** for easy extension and modification

### Performance Considerations

- Embedding generation is the slowest operation (~1-2s per article)
- Playwright rendering takes ~2-3s per slide
- Local LLM summarization depends on hardware (3-10s per group)
- Consider batching operations for large datasets

### Security Notes

- API keys stored in `.env` (not committed)
- User-Agent configurable for scraping
- No external data transmission except to configured APIs
- All processing happens locally

## Quick Test Workflow

Once command implementations are complete:

```bash
# 1. Add a test source to data/sources.json
# 2. Test scraping
npm run scrape

# 3. Test grouping
npm run group

# 4. Test summarization
npm run summarize <group-id> --method=template

# 5. Test generation
npm run generate <group-id>
```

## Development Tips

- Use `LOG_LEVEL=debug` in `.env` for verbose logging
- Test with template summarizer first (no LLM required)
- Start with 1-2 sources before scaling up
- Keep threshold at 0.75 for initial testing
- Use `--dry-run` flag when implementing clean command

## Resources

- Ollama docs: https://ollama.com
- Playwright docs: https://playwright.dev
- Transformers.js: https://huggingface.co/docs/transformers.js
- Compromise NLP: https://compromise.cool

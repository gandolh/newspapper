# Implementation TODOs

This directory contains detailed implementation guides for each CLI command.

## Command Priority

Implement in this order for a working end-to-end workflow:

1. **scrape** - Entry point, fetches articles
2. **list** - Useful for debugging and viewing data
3. **group** - Clusters articles (most complex)
4. **summarize** - Generates slide content
5. **generate** - Renders images
6. **export** - Packages for publishing
7. **extract-entities** - Optional NLP feature
8. **query-entities** - Search by entities
9. **clean** - Maintenance command

## Quick Start for Implementation

Each TODO file contains:
- Function signature
- Required imports
- Step-by-step implementation
- Error handling notes
- Testing commands
- Expected output examples

## General Patterns

All commands should:
- Use `ora` for progress spinners
- Use `logger` for consistent output
- Handle errors gracefully
- Show helpful messages on failure
- Support --help flag (handled by commander)

## Testing Strategy

1. Start with template-based summarization (no LLM needed)
2. Test with 1-2 news sources initially
3. Use --dry-run flags where available
4. Verify file outputs in data/ and output/ directories

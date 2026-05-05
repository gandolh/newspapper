# TODO: Implement Clean Command

**File:** `src/commands/clean.js`

## Overview
Delete old articles, groups, and summaries with confirmation prompts.

## Key Implementation Points

1. Parse `--older-than` (e.g., "30d") to date cutoff
2. Load manifest and filter items by date and status
3. Show table of items to be deleted with --dry-run support
4. Ask for confirmation unless --force
5. Delete files and update manifest
6. Show summary of deleted items and space freed

## Testing
```bash
npm run clean --dry-run
npm run clean --older-than=60d --status=published
```

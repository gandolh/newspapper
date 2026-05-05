# TODO: Implement List Command

**File:** `src/commands/list.js`

## Overview
List articles, groups, or summaries with filtering and formatting options.

## Key Implementation Points

1. Load manifest based on --type (articles/groups/summaries)
2. Filter by --status, --source, --days
3. Format as table (cli-table3) or JSON
4. Show relevant columns for each type
5. Add summary statistics at bottom

## Testing
```bash
npm run list --type=groups
npm run list --type=articles --status=scraped --format=json
```

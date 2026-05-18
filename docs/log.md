# Change Log

Append-only. Format: `## [YYYY-MM-DD] action | summary`

---

## [2026-05-06] init | created wiki from existing docs/, .claude/ context files, and docs/todos/

## [2026-05-12] refactor | simplified pipeline: SQLite-only storage, dropped group/export/summarize/query-entities, new format REPL command (Ollama-only), generate takes post dir; removed openai/@xenova/ml-distance deps

## [2026-05-12] remove | dropped Playwright entirely; scraping now HTTP+RSS only; rendering uses @napi-rs/canvas (already in place)

## [2026-05-18] rewrite | v2 plan: deleted all src/, simplified to a single `newspapper run` command (scrape RSS → compose via Ollama → render via Satori); dropped entity extraction, REPL, second theme, OpenAI, Playwright, canvas, sharp, cheerio, compromise, inquirer, ora, handlebars; SQLite kept for article dedupe + post history; versioned output folders per same-day re-run

## [2026-05-18] docs | rewrote index, commands, architecture, data, modules, configuration, design-systems, dependencies, CLAUDE.md, README.md, and .env.example to match v2 plan; deleted design-systems/digital-broadsheet.yaml and stale docs/superpowers/

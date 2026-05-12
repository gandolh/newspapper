# Change Log

Append-only. Format: `## [YYYY-MM-DD] action | summary`

---

## [2026-05-06] init | created wiki from existing docs/, .claude/ context files, and docs/todos/

## [2026-05-12] refactor | simplified pipeline: SQLite-only storage, dropped group/export/summarize/query-entities, new format REPL command (Ollama-only), generate takes post dir; removed openai/@xenova/ml-distance deps

## [2026-05-12] remove | dropped Playwright entirely; scraping now HTTP+RSS only; rendering uses @napi-rs/canvas (already in place)

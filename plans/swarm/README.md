# v3 swarm plan — orchestration map

Each file below is a self-contained brief for ONE agent. Waves run sequentially; agents within a wave run in parallel (disjoint file ownership). The orchestrator commits to main after each green wave.

| Wave | File | Agent task | Parallel with |
|------|------|-----------|---------------|
| 0 | `00-scaffold.md` | Monorepo scaffold (core/api/ui), contracts in core/src/types.ts, CLI removal, all deps | — |
| 1 | `11-templates.md` | Template JSON system + HTML interpreter + 9 warm-industrial docs | 12, 13, 14, 15 |
| 1 | `12-render.md` | Playwright HTML→PNG, output dirs, ZIP | 11, 13, 14, 15 |
| 1 | `13-compose.md` | Ollama client (local+cloud), composePost, caption, slide AI | 11, 12, 14, 15 |
| 1 | `14-storage-scrape.md` | SQLite migrations, posts/settings/sources/prompt repos, scrape | 11, 12, 13, 15 |
| 1 | `15-ui-shell.md` | Layout, nav, warm-editorial kit, API client, placeholder pages | 11, 12, 13, 14 |
| 2 | `20-api.md` | All Fastify routes wiring core; SSE; static | — |
| 3 | `31-wizard.md` | Wizard container + Scrape + Compose steps | 32, 33, 34 |
| 3 | `32-editor.md` | EditorStep (slide editing, previews, slide AI) | 31, 33, 34 |
| 3 | `33-export-history.md` | ExportStep (render/caption/ZIP) + History page | 31, 32, 34 |
| 3 | `34-pages.md` | Sources / Settings / Prompt pages | 31, 32, 33 |
| 4 | `40-builder.md` | Visual template builder | — |
| 5 | `50-integration.md` | E2E against Ollama Cloud, fixes, docs + CLAUDE.md rewrite | — |

Cross-agent conventions: agents never edit package.json (Wave 0 installs everything; gaps go to `NEEDS.md` here), never touch `docs/`/`CLAUDE.md` (Wave 5 owns them), never git commit. Contracts: `core/src/types.ts` (data), wave files themselves (component props, API routes).

**Before Wave 5: `.env` must contain a working `OLLAMA_API_KEY` (+ `OLLAMA_HOST=https://ollama.com`).**

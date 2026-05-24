# Change Log

Append-only. Format: `## [YYYY-MM-DD] action | summary`

---

## [2026-05-06] init | created wiki from existing docs/, .claude/ context files, and docs/todos/

## [2026-05-12] refactor | simplified pipeline: SQLite-only storage, dropped group/export/summarize/query-entities, new format REPL command (Ollama-only), generate takes post dir; removed openai/@xenova/ml-distance deps

## [2026-05-12] remove | dropped Playwright entirely; scraping now HTTP+RSS only; rendering uses @napi-rs/canvas (already in place)

## [2026-05-18] rewrite | v2 plan: deleted all src/, simplified to a single `newspapper run` command (scrape RSS → compose via Ollama → render via Satori); dropped entity extraction, REPL, second theme, OpenAI, Playwright, canvas, sharp, cheerio, compromise, inquirer, ora, handlebars; SQLite kept for article dedupe + post history; versioned output folders per same-day re-run

## [2026-05-18] docs | rewrote index, commands, architecture, data, modules, configuration, design-systems, dependencies, CLAUDE.md, README.md, and .env.example to match v2 plan; deleted design-systems/digital-broadsheet.yaml and stale docs/superpowers/

## [2026-05-18] scaffold | npm init + tsconfig (ESM, NodeNext, react-jsx) + vitest.config + stub src/cli.ts with run/sources/list/clean via cac; installed pinned deps: rss-parser, better-sqlite3, satori, @resvg/resvg-js, react, dotenv, cac (runtime) and typescript, tsx, vitest, @types/node, @types/react, @types/better-sqlite3 (dev); converted warm-industrial.yaml → .json; switched scrape from RSS-only to RSS-for-discovery + per-article body fetch with regex HTML strip; updated docs accordingly; un-gitignored fonts/

## [2026-05-18] implement | full v2 pipeline: util/{config,logger,paths}, storage/{db,articles,posts}, scrape/{rss,body,index}, compose/{ollama,prompt,parse,index}, render/{theme,fonts,satori,resvg,slides/{frame,title,body,quote,index}}, commands/{sources,list,clean}, run.ts orchestrator wired into cli.ts. Replaced Epilogue/Manrope/Newsreader (broken under opentype.js variable-font parsing) with Inter (static TTFs from rsms/inter v4.0) at weights 400/500/600/700/800/900. Sample render verified visually — title-main, body-list, quote-pullout, body-comparison, title-statement all clean. 20 tests passing (stripHtml, parsePost, 9-variant end-to-end render). Added starter data/sources.json (BBC + Guardian + Reuters); updated .gitignore to track sources.json under data/.

## [2026-05-24] cleanup | removed dead v1 prompts/ dir (format-preview.hbs, format-slides.hbs), removed unused px() from src/render/theme.ts, deduped error-handling in src/cli.ts via shared handle() wrapper

## [2026-05-24] restructure | consolidated root: design-systems/ + templates/ + fonts/ → assets/, newspaper-infra/ → infra/, soul.md → docs/soul.md. Updated path refs in src/render/{theme,fonts}.ts and docs.

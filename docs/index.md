# Wiki Index

Documentation for Newspapper v3. Maintained by Claude Code sessions.

## What this project is

A local web app that turns today's RSS news into an Instagram-style slide post (1080×1080 PNGs).

```
RSS feeds  →  scrape  →  compose (Ollama)  →  edit  →  render (Chromium)  →  export ZIP
```

UI wizard at `http://localhost:4321`, API at `http://localhost:3001`. No CLI, no cloud services (except Ollama Cloud as an optional LLM backend).

## Pages

| File | Contents |
|------|----------|
| [commands.md](commands.md) | Running the app (npm scripts, dev vs prod, ports) |
| [architecture.md](architecture.md) | Monorepo layout, three workspaces, pipeline diagram, SSE endpoints |
| [data.md](data.md) | SQLite schema, TemplateDoc format, sources.json, prompt.md, output convention |
| [modules.md](modules.md) | core module APIs as actually exported |
| [configuration.md](configuration.md) | Env vars, settings precedence, Playwright Chromium install |
| [design-systems.md](design-systems.md) | warm-industrial tokens, template JSON system, builder |
| [dependencies.md](dependencies.md) | Package list per workspace + rationale |
| [api.md](api.md) | Full HTTP route table (method, path, body, response, SSE events) |

## Maintenance

This wiki is maintained by Claude Code. When making changes, update the relevant pages and append a line to [log.md](log.md).

Rules:
1. **When you change route behavior** → update `docs/api.md`.
2. **When you change a schema** → update `docs/data.md`.
3. **When you add, remove, or rename a module** → update `docs/modules.md` and `docs/architecture.md`.
4. **When you add or drop a dependency** → update `docs/dependencies.md`.
5. **When you change env vars or setup** → update `docs/configuration.md` and `.env.example`.
6. **After any wiki update** → append one line to `docs/log.md`:
   ```
   ## [YYYY-MM-DD] action | one-line summary
   ```
7. **If you add a wiki page** → register it in the `docs/index.md` table.

# Newspapper

Write a news post as markup. Get 1080×1080 slides.

Newspapper is a local web app for making Instagram-style slide posts. You write
the post yourself in a small markup language called **Newspapper Wizard**
(`.wzd`), watch it set on a live canvas beside the source, and compile it to
JPEGs plus a caption.

```
.wzd document  →  compile  →  HTML  →  Chromium  →  1080² JPEGs  →  publish / ZIP
```

**No model writes anything.** There is no LLM in this product, local or remote.
RSS is still here, but as a *library of source material* to write from — search
feeds by keyword, save what is useful, quote it — not as a pipeline that
produces a post.

## Prerequisites

- **Node.js.** No `engines` field is declared; developed and gated on Node 24.
  All three workspaces are ESM (`"type": "module"`).
- Nothing else. No model server, no cloud account, no API key.

## Quick start

```bash
# 1. Install
npm install
npx playwright install chromium     # the renderer; not part of npm install

# 2. Configure
cp .env.example .env
# Leave SESSION_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD blank for local dev and
# you get admin / newspapper-dev with a per-boot session key. Fill them in for
# anything else — the server refuses to start without them outside development.

# 3. Run
npm run dev
# API on http://localhost:3001, UI on http://localhost:4321
```

Open <http://localhost:4321> and sign in.

## Making a post

**1. Write it.** You land on the editor (`/`) with a starter document already
loaded. The left pane is the `.wzd` source; the right is the live 1080 canvas.
Two top-level elements, and casing carries the meaning — lowercase tags are
metadata, capitalised tags draw:

```wzd
<head>
  <title>Three Things About the Budget</title>
  <description>What actually changed, minus the spin.</description>
  <keywords>budget, economy, tax</keywords>
  <date>2026-08-31</date>
  <caption>The budget dropped. Here's what actually moved.</caption>
  <hashtags>#news #budget #economy</hashtags>
</head>

<body>
  <Slide>
    <Kicker>Economy</Kicker>
    <Heading size="xl">Three things about the budget</Heading>
  </Slide>

  <Slide>
    <Heading>What changed</Heading>
    <List>
      <Item>Fuel duty frozen, again</Item>
      <Item>Income tax thresholds held flat</Item>
    </List>
    <PageCounter />
  </Slide>
</body>
```

Each `<Slide>` is one image. Type it, or drag components in from the palette —
either way the source is written through the formatter, so it reads as if a
person typed it. Click anything in the preview to select it and edit its props
in the inspector. Props pick from named scales (`size`, `align`, `emphasis`);
there is no raw CSS field, on purpose, so a post is on-brand by construction.
The linter flags an unknown component, a bad prop value or a missing title as
you go. Saving is automatic.

**2. Add pictures, if you want any.** Upload an image from the editor; it is
stored, normalized, and referenced as `<Image src="harbour-at-dawn-9f3a1c2b" />`.

**3. Find something to write about, if you need it.** `/articles` searches your
RSS feeds by keyword and lets you save the results into a library. Add and test
feeds on the same page.

**4. Render it.** Go to `/posts`, hit render. Headless Chromium screenshots each
slide at 1080×1080 into `output/YYYY-MM-DD-N/`, alongside `slides.json` and
`caption.txt` (your `<caption>` plus `<hashtags>`).

**5. Publish and export.** Publishing marks the post published and runs a
one-time JPEG optimization pass over the render — it never runs twice, so the
image cannot degrade. Export downloads the whole run as a ZIP, ready to upload.

Pick a theme per post in the editor, or set the default in `/settings`. Three
ship: `warm-industrial-1`, `-2`, `-3` — one design in three primary colours.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API (3001) + UI dev server (4321) |
| `npm run build` | Format check, then typecheck all three workspaces, then build the UI |
| `npm test` | 657 tests over `core`, `api` and `ui` |
| `npm run lint` | ESLint over all three workspaces |
| `npm run fmt` | Prettier over all three workspaces |

More, including what each gate does *not* cover:
[commands.md](corpus/wiki/commands.md).

## Documentation

Everything lives in [`corpus/`](corpus/index.md) — start at the index, and read
at most two or three pages from it.

- [overview.md](corpus/wiki/overview.md) — what this is, and the lineage that explains it
- [status.md](corpus/wiki/status.md) — where things stand right now
- [markup.md](corpus/wiki/markup.md) — the `.wzd` language in full
- [architecture.md](corpus/wiki/architecture.md) — workspaces, routing, the flow
- [api.md](corpus/wiki/api.md) — the HTTP route table
- [data.md](corpus/wiki/data.md) — SQLite schema and on-disk shapes
- [configuration.md](corpus/wiki/configuration.md) — env vars and setup
- [decisions.md](corpus/wiki/decisions.md) — the locked calls, and what each rejected
- **[green-because-nothing-ran.md](corpus/wiki/green-because-nothing-ran.md) —
  the eight times a tool here reported success while checking nothing. Read it
  before you trust a green command in this repo.**

## License

MIT

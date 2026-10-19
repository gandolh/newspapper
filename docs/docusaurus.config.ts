import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'
import { themes as prismThemes } from 'prism-react-renderer'

/**
 * Newspapper's documentation site.
 *
 * **Almost entirely rendered, and deliberately so.** Newspapper's corpus already
 * carries `api.md`, `data.md`, `architecture.md`, `modules.md`,
 * `configuration.md`, `commands.md` and `markup.md` — the reference material a
 * docs site would otherwise author. Restating any of it would create a second
 * copy to keep in step with the first, which is the failure this whole
 * arrangement exists to avoid. So exactly one page is authored: an orientation
 * page carrying the diagram (docs/index.mdx).
 *
 *   • Corpus     → every corpus/wiki page plus log.md, synced by scripts/sync-corpus.mjs.
 *   • Reference  → TypeDoc over @newspapper/core's public barrel, in static/reference/.
 *   • Diagrams   → archify, from the typed JSON in diagrams/, into static/diagrams/.
 */

// The deployed base path, baked in rather than injected at deploy time.
//
// vps-deploy ships what this repo already built and VERIFIES this base — it does
// not set it. A variable the deploy passes that changes nothing is a variable
// that can silently disagree, whereas a value baked here and checked there
// cannot. Build with `npm run docs`; a wrong base fails the deploy by name
// instead of shipping a page whose every asset 404s.
//
// DOCS_BASE still overrides it, for building a copy to serve from somewhere else.
const baseUrl = process.env.DOCS_BASE ?? '/newspapper/docs/'

const config: Config = {
  title: 'Newspapper',
  tagline: 'Write a post in .wzd markup, compile it to 1080² JPEGs. A paste-up board for setting a news carousel.',
  // The production origin, as the Starlight config had it; only used for
  // absolute URLs (the sitemap, canonical and og:url tags).
  url: 'https://gandolh.ro',
  baseUrl,
  favicon: 'img/favicon.svg',
  // Directory-style URLs (/wiki/overview/ → wiki/overview/index.html), the
  // layout the Starlight site published, so every old URL still resolves.
  trailingSlash: true,
  future: { v4: true },
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  markdown: {
    // .md (the synced corpus) parses as CommonMark, .mdx (the landing) as MDX.
    // As MDX the corpus does not compile: a bare `<` or `{` in prose is JSX.
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'throw' },
  },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs-only site: no /docs/ prefix under the base
          sidebarPath: './sidebars.ts',
          // Starlight showed no breadcrumbs; the sidebar already says where you are.
          breadcrumbs: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  // Local, offline search (Starlight shipped Pagefind; Docusaurus ships nothing).
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      { hashed: true, docsRouteBasePath: '/', indexBlog: false, indexPages: false },
    ],
  ],
  themeConfig: {
    // Light only. The Mechanical is a board-white working surface; there is no
    // dark board, and inventing one would be inventing a second design system.
    colorMode: { defaultMode: 'light', disableSwitch: true, respectPrefersColorScheme: false },
    // A light code theme; custom.css lays the galley onto paper. Without this,
    // Docusaurus defaults to palenight, a dark block on a light board.
    prism: { theme: prismThemes.github },
    navbar: {
      title: 'Newspapper',
      items: [{ href: 'https://github.com/gandolh/newspapper', label: 'GitHub', position: 'right' }],
    },
  } satisfies Preset.ThemeConfig,
}

export default config

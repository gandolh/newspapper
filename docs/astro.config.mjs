// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

/**
 * Newspapper's documentation site.
 *
 * **Almost entirely rendered, and deliberately so.** Newspapper's corpus already
 * carries `api.md`, `data.md`, `architecture.md`, `modules.md`,
 * `configuration.md`, `commands.md` and `markup.md` — the reference material a
 * docs site would otherwise author. Restating any of it would create a second
 * copy to keep in step with the first, which is the failure this whole
 * arrangement exists to avoid. So exactly one page is authored: an orientation
 * page carrying the diagrams.
 *
 *   • Corpus     → 24 pages synced by scripts/sync-corpus.mjs.
 *   • Reference  → TypeDoc over @newspapper/core's public barrel.
 *   • Diagrams   → archify, from the typed JSON in diagrams/.
 *
 * Deployed at https://gandolh.ro/newspapper/docs/.
 */
// The deployed base path, baked in rather than injected at deploy time.
//
// vps-deploy ships what this repo already built and VERIFIES this base — it does
// not set it. That is the estate's rule for the case that matters most (Ward's
// UI does the same, see vps-deploy/stacks/ward.ts): a variable the deploy passes
// that changes nothing is a variable that can silently disagree, whereas a value
// baked here and checked there cannot. Build with `npm run docs`; a wrong base
// fails the deploy by name instead of shipping a page whose every asset 404s.
//
// DOCS_BASE still overrides it, for building a copy to serve from somewhere else.
const base = process.env.DOCS_BASE ?? '/newspapper/docs/'

export default defineConfig({
  base,
  site: 'https://gandolh.ro',
  integrations: [
    starlight({
      title: 'Newspapper',
      description:
        'Write a post in .wzd markup, compile it to 1080² JPEGs. A paste-up board for setting a news carousel.',
      tagline: 'The workstation, not the slides it renders.',
      customCss: ['./src/styles/theme.css'],
      // Light only. The Mechanical is a board-white working surface; there is no
      // dark board, and inventing one would be inventing a second design system.
      components: {
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/gandolh/newspapper' }],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'What Newspapper is', link: '/' },
            { label: 'Overview', link: '/wiki/overview/' },
            { label: 'The product', link: '/wiki/product/' },
            { label: 'Architecture', link: '/wiki/architecture/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'HTTP API', link: '/wiki/api/' },
            { label: 'Data', link: '/wiki/data/' },
            { label: 'Modules', link: '/wiki/modules/' },
            { label: 'Configuration', link: '/wiki/configuration/' },
            { label: 'Commands', link: '/wiki/commands/' },
            { label: 'The .wzd markup', link: '/wiki/markup/' },
            { label: 'Core (TypeDoc) ↗', link: '/reference/', attrs: { target: '_blank' } },
          ],
        },
        {
          label: 'Design — The Mechanical',
          items: [
            { label: '§1–§4 — ground, colour, type', link: '/wiki/design/' },
            { label: '§5–§9 — components, motion, rules', link: '/wiki/design-components/' },
            { label: 'Design systems', link: '/wiki/design-systems/' },
            { label: 'Browser chrome', link: '/wiki/chrome/' },
          ],
        },
        {
          label: 'Decisions',
          items: [
            { label: 'Decisions', link: '/wiki/decisions/' },
            { label: 'Authoring', link: '/wiki/decisions-authoring/' },
            { label: 'Engineering', link: '/wiki/decisions-engineering/' },
            { label: 'Security', link: '/wiki/decisions-security/' },
            { label: 'Tooling', link: '/wiki/decisions-tooling/' },
            { label: 'Dependencies', link: '/wiki/dependencies/' },
          ],
        },
        {
          label: 'State',
          items: [
            { label: 'Status', link: '/wiki/status/' },
            { label: 'Green because nothing ran', link: '/wiki/green-because-nothing-ran/' },
            { label: 'Glossary', link: '/wiki/glossary/' },
            { label: 'Open questions', link: '/wiki/open-questions/' },
            { label: 'Change log', link: '/wiki/log/' },
          ],
        },
      ],
    }),
  ],
})

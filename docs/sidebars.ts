import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

// The curated sidebar, ported from the Starlight config. Doc items are checked
// at build time: an entry for a page that does not exist fails the build. Doc
// ids are paths under docs/ without the extension (docs/wiki/status.md →
// 'wiki/status').
//
// The sync publishes every corpus/wiki page, but this list is by hand, so a new
// wiki page is built and reachable by link before it is listed here. Add it.
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Start here',
      collapsible: false,
      items: [
        { type: 'doc', id: 'index', label: 'What Newspapper is' },
        { type: 'doc', id: 'wiki/overview', label: 'Overview' },
        { type: 'doc', id: 'wiki/product', label: 'The product' },
        { type: 'doc', id: 'wiki/architecture', label: 'Architecture' },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/api', label: 'HTTP API' },
        { type: 'doc', id: 'wiki/api-reader', label: 'HTTP API — the Reader' },
        { type: 'doc', id: 'wiki/data', label: 'Data' },
        { type: 'doc', id: 'wiki/data-reader', label: 'Data — the Reader' },
        { type: 'doc', id: 'wiki/migrations', label: 'Migrations' },
        { type: 'doc', id: 'wiki/modules', label: 'Modules' },
        { type: 'doc', id: 'wiki/modules-reader', label: 'Modules — the Reader' },
        { type: 'doc', id: 'wiki/configuration', label: 'Configuration' },
        { type: 'doc', id: 'wiki/commands', label: 'Commands' },
        { type: 'doc', id: 'wiki/markup', label: 'The .wzd markup' },
        // Generated HTML in static/, not a Docusaurus route: `pathname://` makes
        // it a plain link (new tab, baseUrl still applied) instead of a router
        // navigation that would 404.
        { type: 'link', label: 'Core (TypeDoc) ↗', href: 'pathname:///reference/' },
      ],
    },
    {
      type: 'category',
      label: 'Design — The Mechanical',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/design', label: '§1–§4 — ground, colour, type' },
        { type: 'doc', id: 'wiki/design-components', label: '§5–§9 — components, motion, rules' },
        { type: 'doc', id: 'wiki/design-systems', label: 'Design systems' },
        { type: 'doc', id: 'wiki/chrome', label: 'Browser chrome' },
      ],
    },
    {
      type: 'category',
      label: 'Decisions',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/decisions', label: 'Decisions' },
        { type: 'doc', id: 'wiki/decisions-authoring', label: 'Authoring' },
        { type: 'doc', id: 'wiki/decisions-engineering', label: 'Engineering' },
        { type: 'doc', id: 'wiki/decisions-security', label: 'Security' },
        { type: 'doc', id: 'wiki/decisions-accounts', label: 'Accounts' },
        { type: 'doc', id: 'wiki/decisions-hardening', label: 'Hardening' },
        { type: 'doc', id: 'wiki/decisions-tooling', label: 'Tooling' },
        { type: 'doc', id: 'wiki/dependencies', label: 'Dependencies' },
      ],
    },
    {
      type: 'category',
      label: 'State',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/status', label: 'Status' },
        { type: 'doc', id: 'wiki/green-because-nothing-ran', label: 'Green because nothing ran' },
        { type: 'doc', id: 'wiki/glossary', label: 'Glossary' },
        { type: 'doc', id: 'wiki/open-questions', label: 'Open questions' },
        { type: 'doc', id: 'wiki/log', label: 'Change log' },
      ],
    },
  ],
}

export default sidebars

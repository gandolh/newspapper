---
paths:
  - "ui/src/**"
---

# The UI (ui/src)

- Read `corpus/wiki/chrome.md` and `corpus/wiki/design-components.md` before you change the chrome.
- Every route but `/login` renders inside one `<App>` element at one position in `ui/src/routes.tsx`, so
  the sidebar tray stays mounted. A route that renders its own `<App>` breaks that without an error.
- Base UI is imported only under `ui/src/components/ui/`, from its part subpaths (`@base-ui/react/dialog`,
  not the package root). Everything else uses the wrappers in `components/ui/`.
- The galley's textarea and its `<pre>` share every metric (`corpus/wiki/design-components.md` section 5);
  `SourcePane.wax.test.ts` guards it, so run it after any change to either.
- The chrome is light by default and follows the Light / Dark / System switch (`lib/appearance.ts`, `data-theme` on
  `<html>`; `dark:` keys off it). The slide canvas, the preview and the render never follow it; the app chrome and the
  slide themes share nothing, on purpose.
- Styling is Tailwind 4 in one stylesheet, `ui/src/styles/index.css`. Tokens only, from `@theme`: no arbitrary
  colours (lint refuses `bg-[#...]`), no default scale (`text-sm`, `rounded-md` and `bg-red-500` produce nothing). A
  new token's name also goes into `lib/cn.ts`'s lists, or tailwind-merge drops classes. There is no Preflight: do not
  use `border-dashed` (it gives the other sides a border); dash one edge with `[border-top-style:dashed]`.
- The slide canvas takes no global: nothing in the stylesheet may reach inside it (`previewParity.chromium.test.ts`
  compares it with the render, in light and dark).
- The galley's elements carry `data-testid` hooks (`galley-highlight`, `galley-wax-run`, `galley-selection-ground`).
  Tests select by role and name, `data-testid` only where no role fits (a glyph run), never by a class name.
- A Base UI state is a variant (`data-checked:`, `data-popup-open:`); `hover:` applies only on hover-capable devices.
- `ui/src/lib/api.ts` is the one place the base prefix is applied. Build URLs with `withBase`.
- Components, layouts and pages use named exports. A default export is for the virtual proof-sheet
  contract and ambient `declare module` blocks only (`import-x/no-default-export` enforces it).
- An async handler goes to an event prop as `() => void run()`; the lint rules refuse a bare promise.

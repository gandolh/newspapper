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
- The chrome is light by default. The app chrome and the slide themes share nothing, on purpose.
- `ui/src/lib/api.ts` is the one place the base prefix is applied. Build URLs with `withBase`.
- Components, layouts and pages use named exports. A default export is for the virtual proof-sheet
  contract and ambient `declare module` blocks only (`import-x/no-default-export` enforces it).
- An async handler goes to an event prop as `() => void run()`; the lint rules refuse a bare promise.

# Task 98 — Deeply nested markup overflows the parser and blanks the editor with no recovery

## Context

Found in the 2026-09 sweep and reproduced. `parseNodes`/`parseElement`
([core/src/wizard/parse.ts:134-317](../../../core/src/wizard/parse.ts)) recurse one
JS frame per nesting level with no depth cap, but the parser's documented contract
(parse.ts:8-10) is "**parsing never throws** … every problem is a `syntax-error`
diagnostic and the parser recovers." A document nesting a container ~5000 levels
deep (a pasted/duplicated chunk, or a bug in the editor's own move/duplicate
machinery) makes `parse()` throw `RangeError: Maximum call stack size exceeded`.

Reproduced: depth 100 and 1000 parse clean; depth 5000 throws `RangeError`.

Server-side this is caught (`render.ts` wraps `parseOrThrow`). Client-side,
`EditorIsland.tsx:157` calls `parse(source)` in a bare `useMemo` on every
keystroke with no try/catch, and there is **no `ErrorBoundary` anywhere in
`ui/src`** (grep: zero `componentDidCatch`/`getDerivedStateFromError`). So the
RangeError crashes the whole React tree to a blank page — and because
`?post=<id>` re-fetches the same markup on reload, the post re-parses and
re-crashes every time: **permanently unopenable through the UI** short of DB
surgery.

## What to do

1. **Cap parser depth.** Add a nesting-depth limit to `parseNodes`/`parseElement`
   (e.g. 200 — well above any real document) that emits a `syntax-error`
   diagnostic and stops recursing instead of overflowing, honouring the
   "never throws" contract. (An explicit stack is an alternative but heavier;
   the depth cap is enough.)
2. **Add a top-level editor ErrorBoundary** so any future exception in the editor
   subtree degrades to a readable error state, not a blank page — the app should
   never become a white screen from one bad document.

## Acceptance

- `parse(<6000-deep doc>)` returns diagnostics with a depth `syntax-error` and
  does **not** throw; normal and moderately-nested docs parse unchanged (state the
  depths tested).
- A test mounts the editor (or the boundary) around a component that throws and
  asserts an error UI renders, not a blank tree.
- Every existing wizard parse/format/round-trip test still passes (the cap must
  not change parsing of real documents).
- `npm test`, `npx tsc`, `npm run lint`, `npm run build`, `bash corpus/lint.sh`
  clean.

## Files you OWN

- `core/src/wizard/parse.ts` (+ `parse` tests / a new depth test)
- a new `ui/src/components/ErrorBoundary.tsx` (or similar) and its wiring in the
  editor route
- `ui/src/components/editor/EditorIsland.tsx` only to wrap in the boundary

## Files you must NOT touch

- the `<App>`/route structure invariant (one `<App>` at one position) — wrap
  inside it, don't restructure it
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Depends on brief 81 if the boundary test is a `.test.tsx`.

## Outcome — 2026-10-03

**Parser.** `MAX_DEPTH = 200` (exported). When an element would open past it,
`parseElement` reports one `syntax-error` ("nests elements more than 200 deep
… flatten the nesting") and stops reading the document. It sets `tooDeep`,
which suppresses the "never closed" error each still-open ancestor would
otherwise add. `parse` never throws, as it promises.

Tested depths (`parse-depth.test.ts`): 10, 150 and 197 parse with no
syntax error at all. 1,000 and 6,000 report exactly one depth error, no
"never closed" noise, and no throw. The old parser threw a `RangeError` at
both. All 248 existing wizard tests (parse, format, round-trip) pass
unchanged, so the cap does not touch real documents.

**UI.** New `ui/src/components/ErrorBoundary.tsx` shows the existing
`EmptyState` ("This page hit an error", the message, "Your saved posts are
untouched", and a base-aware "Back to your posts" link) and logs the component
stack. `EditorIsland` wraps `Editor` in it, inside the `ToastProvider`, so the
`<App>` structure is untouched.

`ErrorBoundary.test.tsx` **really mounts** it (`react-dom/client` +
`act`) in `happy-dom`, which is now a pinned UI dev dependency and opted into
per file only. A throwing child renders the error state with the `/posts` link,
and a healthy child renders untouched. `dependencies.md` notes the addition.

`npm test` 735/735, `tsc`, lint and build clean.

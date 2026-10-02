# Task 88 — The uploads-route interception (the render security fix) has no test

## Context

Found in the 2026-09 coverage sweep. `core/src/render/uploads-route.ts` —
`UPLOADS_ROUTE_GLOB`, `localUploadFile`, `installUploadsRoute` — is the mechanism
that let `/uploads/*` become a guarded route (the render browser reads image bytes
from disk instead of over HTTP). It is **referenced in tests only inside doc
comments — never called** (grep: `installUploadsRoute` has zero hits in any
`*.test.ts`). `core/src/render/render.test.ts` renders only text/solid-colour
HTML and never passes `db` to `renderSlides`/`htmlToJpeg`. The corpus itself flags
this: "the interception is unit-shaped only … the rendering path has not been
exercised end to end."

Concrete regression that ships green today: change `UPLOADS_ROUTE_GLOB` from
`'**/uploads/*'` to `'/uploads/*'` (stops matching the absolute render URL), or
break `parseUploadRef`/`findUploadByRef` matching, and **every `<Image>` in every
production render silently comes out blank** — no test fails.

`api/src/routes/uploads.test.ts` has a Chromium sub-test that proves an `<img>`
loads from a **live** `/uploads` HTTP route, but that is the pre-Ward mechanism
(a real Fastify server), not the interception that replaced it.

## What to do

Add a test (extend `render.test.ts` or a new `uploads-route.test.ts`) that uses
the **interception** path — i.e. `renderSlides`/`htmlToJpeg` with a `db`:

1. Create a real upload via the store (`saveUpload`/the uploads module) in a temp
   `UPLOADS_DIR`, of a known solid colour.
2. Compile a one-slide `.wzd` doc with an `<Image src>` referencing that ref, and
   `renderSlides([html], { …, db })`.
3. Decode the JPEG (`sharp(buf).raw()…`) and assert the pixel where the image sits
   is the source colour, not the background — i.e. the interceptor served real
   bytes.
4. Companion case: same render **without** `db` → assert the image region is
   background (the documented "blank" failure), so the `db`-required contract is
   pinned.
5. Negative: a traversal / non-existent / malformed ref falls through
   (`route.fallback()`) and does not read an unintended file — assert via the
   resulting image (still blank) and, if practical, that `localUploadFile`
   returns null for those inputs (unit-level).

Use the repo's existing Chromium skip guard (see brief 91) so this fails, not
silently passes, when a browser is expected but missing.

## Acceptance

- The new test(s) fail if `UPLOADS_ROUTE_GLOB` is changed to not match, or if the
  `db` is dropped from the render call (verify by trying each mutation locally in
  the scratchpad — don't commit the mutation).
- A malformed/traversal ref is proven not to be served.
- `npm test` passes with Chromium present; skips-loudly / fails-under-CI without
  it (per brief 91).
- `npm run lint`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/render/render.test.ts` or a new `core/src/render/uploads-route.test.ts`
- test fixtures/helpers you add

## Files you must NOT touch

- `core/src/render/uploads-route.ts` and `screenshot.ts` — you are testing them,
  not changing them (if a test reveals a bug, file a new brief)
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Depends on the Chromium skip helper from brief 91 (or inline the same guard). If
91 hasn't landed, use `render.test.ts`'s current `browserAvailable` pattern and
note the dependency.

## Outcome — 2026-10-02

New `core/src/render/uploads-route.test.ts`. It saves a solid-red PNG through
the real upload store (temp `UPLOADS_DIR`, temp DB), then renders 1080² HTML
whose background is an absolute `…/uploads/<ref>` URL on a port nothing listens
on (`127.0.0.1:9`). That is the shape a compiled `<Image>` produces. Then it
reads the centre pixel with sharp:
- **with `db`**, red: the interceptor served the bytes from disk;
- **without `db`**, white: the documented blank-image contract is pinned;
- an unknown ref, an encoded traversal (`..%2fsecret.png`) and a literal
  `../secret.png`, with a real red file sitting just outside the store, all
  stay white;
- `localUploadFile` returns null for unknown, malformed, traversal and
  `/original` URLs, and resolves a real ref.

**Mutations, tried and reverted:** with `UPLOADS_ROUTE_GLOB` set to
`'/uploads/*'`, the with-db case fails. With `installUploadsRoute` removed from
`screenshot.ts`, it fails too. The Chromium guard follows `render.test.ts`'s
pattern, and it throws under `CI`. Brief 91 will unify it.

Note: a base-prefixed `/newspapper/uploads/<ref>` URL is *not* served (the
validator wants `/uploads/<ref>`). That is correct: the renderer's URLs come
from `uploadsBaseUrl()` at the server root, never the browser base.

`npm test` 666/666, lint clean.

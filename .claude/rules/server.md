---
paths:
  - "api/src/**"
  - "core/src/**"
---

# The API and the library (api/src, core/src)

- `core/src/wizard` and `core/src/templates` are browser-safe, because the UI imports them: no `node:`
  imports there.
- Every `/api/*` route sits behind the session guard (`api/src/ward/ward.guard.ts`). A route added
  outside it fails open.
- A 5xx never sends its message to the client.
- One `getBrowser` renders. A test that launches Chromium goes through
  `core/src/render/test-support/chromium.ts`, which skips locally and fails under `CI`.
- Dependency versions are exact, and `data/`, `uploads/` and `output/` are gitignored.
- `tsconfig.json` in `core` and `api` includes the tests and is what typecheck and lint read;
  `tsconfig.build.json` leaves them out. Do not point a tool at the build file.
- Route plugins are named exports. `process.env` in `api/src` is a lint warning today; read settings
  through one config module when you add a setting.

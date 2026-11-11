---
summary: The three server-sent event streams (search, render, the Reader's refresh) — the frame format and how the UI reads it, why their outcome is an event and not a status, and how the API treats them in its code structure: no response schema, bodies validated before the stream opens, no socket timeout, and ended with an error event when the server closes.
updated: 2026-11-11
---

# Server-sent event streams

Three long operations stream: **search** (`POST /api/scrape`), **render**
(`POST /api/posts/:id/render`) and **the Reader's refresh**
(`POST /api/reader/refresh`). Their routes are in [api.md](./api.md) and
[api-reader.md](./api-reader.md).

## The protocol

```
event: progress
data: {…}

event: done
data: {…}

event: error
data: {"message": "…"}
```

The UI reads these with `fetch()` (not `EventSource`) and parses the frames by
hand in `ui/src/lib/api.ts` (`sse()`): `EventSource` cannot POST. Once the stream
has begun, a failure arrives as an `error` event rather than a status code. A
response that is not a 2xx (the guard's 401, a body that fails its schema) is
read as JSON and its `error` shown the same way an `error` event's message is.

## In the API's code structure

The helpers are `api/src/plugins/sse.ts`: `sseHeaders`, `sseWrite`, `sseDone`,
`sseError`. They write to `reply.raw`, so Fastify never serialises a stream.

- **No response schema** (Q53, 2026-11-10). Every reply is a 200 of
  `text/event-stream` with its outcome in the events, so a response schema has
  nothing to describe. Each stream has an entry in `scripts/conventions.json`
  saying so; `export.zip`, the two `/uploads/:ref` file routes and the multipart
  upload body are the other four exemptions.
- **Inputs are still validated.** Render declares its `params`; search and the
  refresh declare their `body`. A body of the wrong shape answers a JSON 400
  before the stream opens. A request the handler refuses by its own rules (no
  keyword left after trimming, an unknown source) is still the stream's `error`
  event, as before 2026-11-11.
- **No socket timeout.** The server's `connectionTimeout` (35 s) cuts a socket
  that is silent that long, and a stream can be: a feed or an article body may
  take its full 30 s fetch timeout before the next event, and a search fetches a
  feed and then its bodies. `sseHeaders` sets the stream's own socket timeout to
  0; each step's fetch timeout bounds it instead. `requestTimeout` covers only
  receiving the request, so it never cuts a reply (measured on a real socket,
  2026-11-11).
- **Ended when the server closes.** Fastify runs its `onClose` hooks only after
  the requests in flight finish, so a search waiting on a slow feed would hold a
  SIGTERM for up to 30 s, past close-with-grace's 10 s, and the process would
  exit 1 with the stream cut. The SSE plugin keeps each app's open streams and,
  in a `preClose` hook, ends each with `error: "The server is restarting. Try
  again in a moment."`. Events the work behind it writes later go nowhere. The
  built server, sent SIGTERM mid-render, exits 143 in under 0.1 s.

Measured 2026-11-11 on this machine: a two-slide render streams for 1.4–1.6 s
(Chromium launched cold), a twelve-slide one for 7.4 s; `export.zip` of a
two-slide run takes about 10 ms and publish about 170 ms.

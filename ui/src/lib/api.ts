/**
 * Typed API client for the Newspapper backend.
 *
 * All requests go to `<base>/api/*` — `/api/*` in dev, where Vite proxies to
 * :3001, and `/newspapper/api/*` behind Caddy, which strips the prefix again
 * before Fastify sees it. `api()` and `sse()` below are the ONE place that
 * prefix is applied, which is why every call site can go on writing the plain
 * `/api/...` path it always did.
 */
import { stripBase, withBase } from './base';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * The app's own login page, returning to `next`.
 *
 * `next` is an ORIGIN path with its query (`/newspapper/posts?q=1`), which is
 * what `window.location` holds and what Ward's `returnTo` wants. The login page
 * turns it back into an app path (`safeNext` in `lib/base.ts`) and refuses
 * anything that is not inside this app.
 *
 * `reason` is the session check's code when it refused a session that existed
 * (`ward_session_ended`, `ward_unavailable`), so the login page can say why the
 * person is back there instead of looking like a silent sign-out.
 */
export function loginUrl(next?: string, reason?: string): string {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return `${withBase('/login')}${query ? `?${query}` : ''}`;
}

/**
 * Send the browser to the login page, remembering where it was.
 *
 * Every 401 from `/api/*` means one thing — no live session — and has one
 * response. A browser already on the login page stays put, so a stray 401 there
 * cannot reload the page it is on in a loop.
 */
function redirectToLogin(reason?: string): void {
  if (typeof window === 'undefined') return;
  if (stripBase(window.location.pathname) === '/login') return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(loginUrl(next, reason));
}

/** The session check's code from a 401 body, if it is one: lowercase words only. */
function reasonOf(payload: { reason?: unknown }): string | undefined {
  return typeof payload.reason === 'string' && /^[a-z_]{1,40}$/.test(payload.reason)
    ? payload.reason
    : undefined;
}

export async function api<T = unknown>(
  path: string,
  opts?: RequestInit & { json?: unknown; skipAuthRedirect?: boolean },
): Promise<T> {
  const { json, skipAuthRedirect, ...rest } = opts ?? {};

  const headers = new Headers(rest.headers);
  let body: BodyInit | undefined = rest.body as BodyInit | undefined;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const url = withBase(path);
  const res = await fetch(url, { ...rest, headers, body });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let reason: string | undefined;
    try {
      const payload = (await res.json()) as { error?: string; reason?: unknown };
      if (payload.error) message = payload.error;
      reason = reasonOf(payload);
    } catch {
      // ignore parse failure
    }
    if (res.status === 401 && !skipAuthRedirect) redirectToLogin(reason);
    throw new ApiError(res.status, message);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// SSE streaming helper
// ---------------------------------------------------------------------------

export interface SseHandlers {
  onEvent: (event: string, data: unknown) => void;
  signal?: AbortSignal;
}

/**
 * POST `path` with `body` as JSON, then read the response as a text/event-stream.
 * Parses SSE frames (event:/data: lines, blank-line delimited).
 *
 * Resolves on a `done` event; rejects with an ApiError on an `error` event or
 * a non-2xx HTTP status. Aborted via `handlers.signal`.
 */
export async function sse(path: string, body: unknown, handlers: SseHandlers): Promise<void> {
  const url = withBase(path);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let reason: string | undefined;
    try {
      const payload = (await res.json()) as { error?: string; reason?: unknown };
      if (payload.error) message = payload.error;
      reason = reasonOf(payload);
    } catch {
      // ignore
    }
    if (res.status === 401) redirectToLogin(reason);
    throw new ApiError(res.status, message);
  }

  if (!res.body) throw new ApiError(0, 'No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  return new Promise<void>((resolve, reject) => {
    function parseAndDispatch(block: string) {
      let eventType = 'message';
      let dataLine = '';

      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLine = line.slice(5).trim();
        }
      }

      if (!dataLine) return;

      let parsed: unknown = dataLine;
      try {
        parsed = JSON.parse(dataLine);
      } catch {
        // raw string data
      }

      if (eventType === 'done') {
        handlers.onEvent(eventType, parsed);
        resolve();
        return;
      }

      if (eventType === 'error') {
        handlers.onEvent(eventType, parsed);
        reject(new ApiError(0, typeof parsed === 'string' ? parsed : JSON.stringify(parsed)));
        return;
      }

      handlers.onEvent(eventType, parsed);
    }

    function pump(): void {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            // flush remaining buffer
            if (buffer.trim()) parseAndDispatch(buffer.trim());
            resolve();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // Split on double newlines (SSE event delimiter)
          const blocks = buffer.split(/\n\n/);
          // Last element is an incomplete block — keep in buffer
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            if (block.trim()) parseAndDispatch(block.trim());
          }

          pump();
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') {
            resolve();
          } else {
            reject(err);
          }
        });
    }

    pump();
  });
}

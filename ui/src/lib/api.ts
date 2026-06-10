/**
 * Typed API client for the Newspapper backend.
 * All requests go to /api/* (Astro dev server proxies to :3001).
 */

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

export async function api<T = unknown>(
  path: string,
  opts?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = opts ?? {};

  const headers = new Headers(rest.headers);
  let body: BodyInit | undefined = rest.body as BodyInit | undefined;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const url = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(url, { ...rest, headers, body });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // ignore parse failure
    }
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
export async function sse(
  path: string,
  body: unknown,
  handlers: SseHandlers,
): Promise<void> {
  const url = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // ignore
    }
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

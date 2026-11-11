/**
 * SSE helper for long-running operations.
 * These are POST endpoints — the UI reads the stream with fetch, not EventSource.
 */
import { Socket } from "node:net";
import type { FastifyReply } from "fastify";

export function sseHeaders(reply: FastifyReply): void {
  // A stream can go quiet for longer than the server's connectionTimeout: a feed or an article body
  // may take its full 30 s fetch timeout before the next event. The socket's idle timeout would
  // cut the stream mid-way, so this connection has none; each step's own timeout bounds it, and
  // Node sets the keep-alive timeout once the response ends. (`inject()` has no real socket.)
  const socket = reply.raw.socket;
  if (socket instanceof Socket) socket.setTimeout(0);
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Transfer-Encoding", "chunked");
  reply.raw.writeHead(200);
}

export function sseWrite(reply: FastifyReply, event: string, data: unknown): void {
  const payload = JSON.stringify(data);
  reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
}

export function sseDone(reply: FastifyReply, data: unknown): void {
  sseWrite(reply, "done", data);
  reply.raw.end();
}

export function sseError(reply: FastifyReply, message: string): void {
  sseWrite(reply, "error", { message });
  reply.raw.end();
}

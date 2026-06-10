/**
 * SSE helper for long-running operations.
 * These are POST endpoints — the UI reads the stream with fetch, not EventSource.
 */
import type { FastifyReply } from 'fastify';

export function sseHeaders(reply: FastifyReply): void {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('Transfer-Encoding', 'chunked');
  reply.raw.writeHead(200);
}

export function sseWrite(reply: FastifyReply, event: string, data: unknown): void {
  const payload = JSON.stringify(data);
  reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
}

export function sseDone(reply: FastifyReply, data: unknown): void {
  sseWrite(reply, 'done', data);
  reply.raw.end();
}

export function sseError(reply: FastifyReply, message: string): void {
  sseWrite(reply, 'error', { message });
  reply.raw.end();
}

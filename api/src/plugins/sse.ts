/**
 * Server-sent events for the three long operations (search, render, the Reader's refresh). They are
 * POST endpoints: the UI reads the stream with fetch, not EventSource.
 */
import { Socket } from "node:net";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";

/** The streams each app has open, keyed by its HTTP server, which every scope of one app shares. */
const openStreams = new WeakMap<object, Set<FastifyReply>>();

function streamsOf(server: object): Set<FastifyReply> {
  let streams = openStreams.get(server);
  if (streams === undefined) {
    streams = new Set();
    openStreams.set(server, streams);
  }
  return streams;
}

/** Whether the stream can still take an event: the server may have ended it, or the client gone. */
function isOpen(reply: FastifyReply): boolean {
  return !reply.raw.writableEnded && !reply.raw.destroyed;
}

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

  const streams = streamsOf(reply.server.server);
  streams.add(reply);
  reply.raw.once("close", () => streams.delete(reply));
}

export function sseWrite(reply: FastifyReply, event: string, data: unknown): void {
  if (!isOpen(reply)) return;
  const payload = JSON.stringify(data);
  reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
}

export function sseDone(reply: FastifyReply, data: unknown): void {
  if (!isOpen(reply)) return;
  sseWrite(reply, "done", data);
  reply.raw.end();
}

export function sseError(reply: FastifyReply, message: string): void {
  if (!isOpen(reply)) return;
  sseWrite(reply, "error", { message });
  reply.raw.end();
}

/**
 * Ends every open stream when the server closes. Fastify runs its onClose hooks only after the
 * requests in flight have finished, and a stream waiting on a slow feed doesn't finish for up to its
 * 30 s fetch timeout, so at SIGTERM close-with-grace would give up after 10 s and exit 1. Each stream
 * gets an `error` event the UI shows, and ends; the work behind it stops with the process, and its
 * later events go nowhere. Wrapped in fastify-plugin, so the hook is on the root.
 */
const endStreamsOnClose: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preClose", async () => {
    for (const reply of streamsOf(fastify.server)) sseError(reply, "The server is restarting. Try again in a moment.");
  });
};

export const sse = fp(endStreamsOnClose, { name: "sse" });

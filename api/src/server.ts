/**
 * The process: the settings, the app, shutdown, listen. Nothing else in the API listens; tests and the
 * seed command build what they need without opening a port.
 */
import { constants } from "node:os";
import closeWithGrace from "close-with-grace";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let port: number;
try {
  const config = loadConfig();
  port = config.port;
  app = await buildApp(config, {
    readerRefreshMinutes: config.readerRefreshMinutes,
    server: {
      // JSON lines, as the container's log collector reads them.
      logger: true,
      // Caddy is the only way in: on the host it connects from loopback, and to a container through
      // Docker's proxy, from the bridge network AUTH_TRUSTED_PROXIES names.
      trustProxy: ["loopback", ...config.trustedProxies],
      // A socket silent this long mid-request is cut. The longest silent JSON route is a source's
      // ping, which waits up to its 30 s feed timeout; the SSE streams turn the limit off for
      // their own connection (`plugins/sse.ts`), since a stream can go quiet for longer.
      connectionTimeout: 35_000,
      // The whole request, body included, must arrive within this. It covers receiving the
      // request only, not the reply: a long render or zip is not cut by it. A 10 MB upload
      // needs about 1.4 Mbit/s to make it.
      requestTimeout: 60_000,
      // Longer than Caddy keeps an idle upstream connection (2 minutes), so Caddy never sends a
      // request down a socket the server has just closed.
      keepAliveTimeout: 125_000,
    },
  });
} catch (err) {
  console.error(`Startup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

/*
 * SIGTERM, SIGINT, an uncaught error: stop taking requests, let the ones in flight finish, run every
 * onClose hook (the Reader's loop stops there), then exit. After 10 s it exits 1 anyway.
 *
 * In the container this process is PID 1, which gets no default action for a signal it has no
 * handler for. A signal still ends it the way an unhandled one does anywhere else, 128 + the
 * signal's number (143 for SIGTERM, 130 for SIGINT), which is also how it ended before 2026-11-04,
 * when npm sat in front of it and forwarded the signal.
 */
closeWithGrace({ delay: 10_000, logger: app.log }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, "closing after an uncaught error");
  else app.log.info(`closing on ${signal ?? "exit"}`);
  await app.close();
  if (signal !== undefined) process.exit(128 + (constants.signals[signal as NodeJS.Signals] ?? 0));
});

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API server listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

import { startReaderSchedule } from "@newspapper/core";
import type { ReaderSchedule, RefreshOptions } from "@newspapper/core";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import { articlesRoutes } from "./features/articles/index.js";
import { health } from "./features/health/index.js";
import { postsRoutes, publishRoutes } from "./features/posts/index.js";
import { readerRoutes } from "./features/reader/index.js";
import { renderRoutes, rendersRoutes } from "./features/renders/index.js";
import { scrapeRoutes } from "./features/scrape/index.js";
import { settingsRoutes } from "./features/settings/index.js";
import { sourcesRoutes } from "./features/sources/index.js";
import { themesRoutes } from "./features/themes/index.js";
import { uploadsRoutes } from "./features/uploads/index.js";
import { db } from "./lib/db.js";
import { auth, createAppAccounts, wardClientFrom } from "./plugins/auth/index.js";
import { errors } from "./plugins/errors.js";
import { sse } from "./plugins/sse.js";
import { staticFiles } from "./plugins/static.js";
import type { Accounts, WardClient } from "../vendor/ward/ward-auth.js";
import type { Config } from "./config.js";

/** Fastify's options that belong to the process. `server.ts` sets them; a test leaves them out. */
type ServerOptions = Pick<
  FastifyServerOptions,
  "logger" | "trustProxy" | "connectionTimeout" | "requestTimeout" | "keepAliveTimeout"
>;

export interface BuildAppOptions {
  server?: ServerOptions;
  /**
   * The Ward client behind "Sign in with Ward". Left out, it is built from the
   * config's `WARD_OIDC_*` set, or absent (local accounts only) when
   * `WARD_OIDC_ISSUER` is unset. A test passes `createWardClient({ ..., fetch })`
   * with a fake `fetch`, or `null` to switch the button off whatever the
   * config says. Nothing contacts Ward at boot.
   */
  wardClient?: WardClient | null;
  /**
   * Minutes between the Reader's background refreshes. **Omitted means off**,
   * so every test that builds an app gets no loop and no timer by
   * construction; `server.ts` passes `config.readerRefreshMinutes`
   * (`READER_REFRESH_MINUTES`, default 30). `0` is off too.
   */
  readerRefreshMinutes?: number;
  /**
   * Passed to every refresh the API starts, the SSE route's and the loop's.
   * Tests inject fetch and DNS here so a refresh never reaches the network.
   */
  readerRefresh?: Pick<RefreshOptions, "deps" | "now">;
}

declare module "fastify" {
  interface FastifyInstance {
    /** The local accounts and sessions. A test mints a session with `startSession`. */
    accounts: Accounts;
    /** The Reader's background loop. Stopped in `onClose`. */
    readerSchedule: ReaderSchedule;
  }
}

/**
 * The app, ready to listen and not listening: `server.ts` listens, and tests inject. It registers in a
 * fixed order: the zod compilers, the error handler, so every route inherits it; the SSE streams' close hook;
 * CORS; the session guard, before every route it covers; the static files; then the routes.
 */
export async function buildApp(config: Config, options: BuildAppOptions = {}) {
  const fastify = Fastify(options.server);
  // Zod checks every request and encodes every reply, in every plugin registered below.
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(errors);
  // Ends the open SSE streams when the server closes, so a slow feed can't hold the shutdown.
  await fastify.register(sse);
  await fastify.register(cors, {
    origin: ["http://localhost:4321", "http://127.0.0.1:4321"],
    credentials: true,
  });

  /*
   * Identity is local, with Ward as a second way in. Accounts and sessions live
   * in the app's own database (`auth_*` tables); a Ward sign-in creates or finds
   * the linked local user, and a Ward-originated session is re-checked against
   * Ward every 30 seconds. Registered before every other route: the guard is an
   * `onRequest` hook, and only routes registered after it are covered.
   */
  const accounts = createAppAccounts(db());
  fastify.decorate("accounts", accounts);
  const wardClient =
    options.wardClient === undefined ? await wardClientFrom(config.auth.ward) : (options.wardClient ?? undefined);
  await fastify.register(auth, {
    accounts,
    wardClient,
    paths: config.auth.paths,
    publicOrigin: config.auth.publicOrigin,
    trustedProxies: config.trustedProxies,
  });

  // The fonts, the rendered runs, and in production the UI bundle with its client-side routes.
  await fastify.register(staticFiles);

  await fastify.register(health);
  await fastify.register(scrapeRoutes);
  await fastify.register(articlesRoutes);
  await fastify.register(postsRoutes);
  await fastify.register(renderRoutes, { port: config.port });
  await fastify.register(rendersRoutes);
  await fastify.register(publishRoutes);
  await fastify.register(themesRoutes);
  await fastify.register(sourcesRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(uploadsRoutes);
  await fastify.register(readerRoutes, { refresh: options.readerRefresh });

  /*
   * The Reader's background refresh: the first run 15 s after
   * boot, then every `readerRefreshMinutes`. One loop per process, which
   * assumes one API process (the container runs one). `db` is a getter, so nothing
   * opens the DB until a run. The loop is stopped, and any run of its own
   * aborted and settled, before the server finishes closing; every timer is
   * unref'd besides, so none can hold a process or vitest open.
   */
  const schedule = startReaderSchedule(() => db(), {
    intervalMinutes: options.readerRefreshMinutes ?? 0,
    refresh: options.readerRefresh,
    onResult: ({ newCount, errors, purged }) =>
      fastify.log.info({ newCount, failedSources: errors.length, purged }, "reader refresh"),
  });
  fastify.decorate("readerSchedule", schedule);
  fastify.addHook("onClose", async () => {
    await schedule.stop();
  });

  return fastify;
}

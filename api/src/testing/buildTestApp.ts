import { buildApp, type BuildAppOptions } from "../app.js";
import { loadConfig } from "../config.js";

export interface TestAppOptions extends Omit<BuildAppOptions, "server"> {
  /** The environment the config is parsed from: none by default, so no setting leaks in from the shell. */
  env?: NodeJS.ProcessEnv;
}

/**
 * The whole app for one test, never listening, with no logger and no Ward unless the test passes one
 * (`wardClient: null` by default). The database is the scratch file the test file points
 * `NEWSPAPPER_DB_PATH` at. Close it after the test.
 *
 *     const app = await buildTestApp();
 *     await app.ready();
 *     const session = (await signInCookie(app)).cookies;
 *     const res = await app.inject({ method: "GET", url: "/api/posts", cookies: session });
 *     await app.close();
 */
export async function buildTestApp({ env = {}, ...options }: TestAppOptions = {}) {
  return buildApp(loadConfig(env), { wardClient: null, ...options });
}

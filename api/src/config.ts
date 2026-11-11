import { READER_REFRESH_MINUTES_DEFAULT } from "@newspapper/core";
import { z } from "zod";
import { parseTrustedProxies, wardClientOptionsFromEnv, type WardClientOptions } from "../vendor/ward/ward-auth.js";
import { authPaths, publicOrigin, type AuthPaths } from "./ward/config.js";

/**
 * The API's settings, parsed once at start. No other file in `api/src` reads the environment.
 *
 * `.env` is loaded before this runs, by `@newspapper/core`'s barrel (`core/src/util/config.ts`, from the
 * working directory) and by the dev script's `--env-file-if-exists=../.env`; in the container the deploy sets
 * the environment. `core` reads its own variables (the data, output and upload paths, the Reader's retention,
 * `UPLOADS_BASE_URL`, `THEME`): it is a library, and those readers are recorded in `scripts/conventions.json`.
 */
export interface Config {
  /** `PORT`, 3001 by default: where the server listens, and the origin a render names for the fonts. */
  port: number;
  /** `READER_REFRESH_MINUTES`, 30 by default: minutes between the Reader's background refreshes; 0 is off. */
  readerRefreshMinutes: number;
  /**
   * `AUTH_TRUSTED_PROXIES`, comma-separated: proxy addresses or ranges beyond loopback (in a container, the
   * Docker bridge Caddy connects from). Fastify's `trustProxy` and the login lockout both read it.
   */
  trustedProxies: string[];
  auth: {
    /** The browser-side paths: `NEWSPAPPER_BASE`, or the base read back out of `WARD_OIDC_REDIRECT_URI`. */
    paths: AuthPaths;
    /** `PUBLIC_ORIGIN`, else the Ward callback's origin, else the dev server's. */
    publicOrigin: string;
    /** The `WARD_OIDC_*` set, or `undefined` when `WARD_OIDC_ISSUER` is unset: local accounts only. */
    ward: WardClientOptions | undefined;
  };
}

/** The environment can't run the API. The message names every variable at fault. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** `KEY=` copied from `.env.example` counts as unset, so the default applies rather than an empty string. */
function unset(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const envSchema = z.object({
  PORT: z.preprocess(unset, z.coerce.number<string>().int().min(1).max(65535).default(3001)),
  READER_REFRESH_MINUTES: z.preprocess(unset, z.coerce.number<string>().min(0).default(READER_REFRESH_MINUTES_DEFAULT)),
});

/** A comma-separated list, trimmed, with blank entries dropped. */
function list(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/**
 * Parses the settings, or throws `ConfigError` listing every bad variable: `PORT=abc`, a negative
 * `READER_REFRESH_MINUTES`, an `AUTH_TRUSTED_PROXIES` entry that isn't an address, or a `WARD_OIDC_ISSUER`
 * without the other three fail here, at start, not at the first request. Tests pass their own `env`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) problems.push(z.prettifyError(parsed.error));

  // The Ward library's own parser: the lockout reads the same list, so the two can't disagree.
  const trustedProxies = list(env["AUTH_TRUSTED_PROXIES"] ?? "");
  try {
    parseTrustedProxies(trustedProxies);
  } catch (error) {
    problems.push(`✖ ${error instanceof Error ? error.message : String(error)}\n  → at AUTH_TRUSTED_PROXIES`);
  }

  let ward: WardClientOptions | undefined;
  try {
    ward = wardClientOptionsFromEnv(env);
  } catch (error) {
    problems.push(`✖ ${error instanceof Error ? error.message : String(error)}\n  → at WARD_OIDC_*`);
  }

  if (problems.length > 0 || parsed.data === undefined) throw new ConfigError(problems.join("\n"));
  return {
    port: parsed.data.PORT,
    readerRefreshMinutes: parsed.data.READER_REFRESH_MINUTES,
    trustedProxies,
    auth: { paths: authPaths(env), publicOrigin: publicOrigin(env), ward },
  };
}

/** The seed command's settings, as given: `seedFromEnv` refuses a missing username or password. */
export function loadSeedConfig(env: NodeJS.ProcessEnv = process.env) {
  return { SEED_USERNAME: env["SEED_USERNAME"], SEED_PASSWORD: env["SEED_PASSWORD"], SEED_ROLE: env["SEED_ROLE"] };
}

/**
 * `NEWSPAPPER_DB_PATH`, read when the database is first opened rather than at start: tests point it at a
 * scratch file before they build the app. Unset, `core` uses `data/newspapper.db`.
 */
export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env["NEWSPAPPER_DB_PATH"];
}

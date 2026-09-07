/**
 * Ward configuration, resolved **lazily** on first use.
 *
 * Lazy rather than validated at import, for the reason the API tests make
 * immediate: `registerAuthGuard` accepts an injected client so a test can
 * decide who is signed in without a network, and an import-time
 * `process.exit(1)` would kill the worker before that injection happened.
 * Reading on first use keeps the failure exactly as loud where it matters — the
 * real client reads all three while the guard is being registered, which is
 * still during boot, before the server listens.
 *
 * All three are required and none has a default. A missing one is a total
 * outage rather than a degraded mode: Ward refuses every unkeyed introspection,
 * so every guarded route would 503.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. newspapper cannot authenticate anybody without it — see .env.example.`,
    );
  }
  return value;
}

export interface WardConfig {
  /** Ward's public origin, and the exact `iss` every access token must carry. */
  publicOrigin: string;
  /**
   * Ward's prefix behind Caddy — `/ward-api` in this estate.
   *
   * No default, deliberately: an empty value resolves the JWKS to
   * `<origin>/.well-known/jwks.json`, a path nothing serves, which would make
   * newspapper reject every token with a clean log on the deploy that shipped
   * it.
   */
  apiBasePath: string;
  /**
   * newspapper's own Ward service key. **A secret** — server-side only, never
   * exposed to the UI, never logged. Issued once from Ward's console and not
   * readable back.
   */
  appKey: string;
}

export function wardConfig(): WardConfig {
  return {
    publicOrigin: required('WARD_PUBLIC_ORIGIN').replace(/\/+$/, ''),
    apiBasePath: required('WARD_API_BASE_PATH'),
    appKey: required('WARD_APP_KEY'),
  };
}

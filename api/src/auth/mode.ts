const LENIENT_MODES = new Set(['', 'development', 'test']);

/**
 * Development-ish mode. Anything else (notably `production`) is strict: the
 * app refuses to boot without explicit credentials and a session secret.
 */
export function isDevelopmentMode(): boolean {
  return LENIENT_MODES.has((process.env['NODE_ENV'] ?? '').trim().toLowerCase());
}

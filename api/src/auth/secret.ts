import { randomBytes } from 'node:crypto';
import { isDevelopmentMode } from './mode.js';

export const MIN_SECRET_LENGTH = 16;

let cached: string | null = null;
let ephemeral = false;

/**
 * The HMAC key for session cookies. Never hardcoded: read from
 * `SESSION_SECRET`, or — in development only — generated per boot, which
 * invalidates every session on restart.
 */
export function getSessionSecret(): string {
  if (cached !== null) return cached;

  const fromEnv = process.env['SESSION_SECRET']?.trim();
  if (fromEnv) {
    if (fromEnv.length < MIN_SECRET_LENGTH) {
      throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    cached = fromEnv;
    ephemeral = false;
    return cached;
  }

  if (!isDevelopmentMode()) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with `openssl rand -hex 32` and put it in .env before starting in production.',
    );
  }

  cached = randomBytes(32).toString('hex');
  ephemeral = true;
  return cached;
}

export function sessionSecretIsEphemeral(): boolean {
  return ephemeral;
}

export function resetSessionSecret(): void {
  cached = null;
  ephemeral = false;
}

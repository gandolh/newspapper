import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'newspapper_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const VERSION = 'v1';

export interface SessionPayload {
  userId: number;
  expiresAt: number;
}

function mac(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = `${VERSION}.${payload.userId}.${payload.expiresAt}`;
  return `${body}.${mac(body, secret)}`;
}

export function createSessionToken(
  userId: number,
  secret: string,
  now: number = Date.now(),
): { token: string; expiresAt: number } {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  return { token: signSession({ userId, expiresAt }, secret), expiresAt };
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [version, rawUserId, rawExpiresAt, presented] = parts as [string, string, string, string];
  if (version !== VERSION) return null;

  const expected = mac(`${version}.${rawUserId}.${rawExpiresAt}`, secret);
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  const userId = Number(rawUserId);
  const expiresAt = Number(rawExpiresAt);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;

  return { userId, expiresAt };
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    if (!name || name in out) continue;
    try {
      out[name] = decodeURIComponent(pair.slice(eq + 1).trim());
    } catch {
      out[name] = pair.slice(eq + 1).trim();
    }
  }
  return out;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** `Secure` everywhere except plain HTTP on loopback, where it would break login. */
export function shouldUseSecureCookie(protocol: string, hostHeader: string | undefined): boolean {
  if (protocol === 'https') return true;
  const host = (hostHeader ?? '').split(':')[0]?.trim().toLowerCase() ?? '';
  return !LOCAL_HOSTS.has(host);
}

function serialize(value: string, maxAge: number, secure: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function sessionCookie(token: string, secure: boolean): string {
  return serialize(token, SESSION_MAX_AGE_SECONDS, secure);
}

export function clearedSessionCookie(secure: boolean): string {
  return serialize('', 0, secure);
}

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

export const CURRENT_PARAMS: ScryptParams = { N: 16384, r: 8, p: 1 };
export const KEY_LENGTH = 32;
export const SALT_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;

const MAX_N = 1 << 20;
const MAX_R = 32;
const MAX_P = 16;

function maxmemFor(params: ScryptParams): number {
  return 256 * params.N * params.r + 1024 * 1024;
}

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N: params.N, r: params.r, p: params.p, maxmem: maxmemFor(params) },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;
}

/** `scrypt$N$r$p$saltBase64$hashBase64` — self-describing so params can be raised later. */
export async function hashPassword(
  password: string,
  params: ScryptParams = CURRENT_PARAMS,
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, params);
  return [
    'scrypt',
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

interface ParsedHash {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
}

export function parsePasswordHash(stored: string): ParsedHash | null {
  if (typeof stored !== 'string') return null;
  const parts = stored.split('$');
  if (parts.length !== 6) return null;
  const [scheme, rawN, rawR, rawP, rawSalt, rawKey] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (scheme !== 'scrypt') return null;

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!isPowerOfTwo(N) || N > MAX_N) return null;
  if (!Number.isInteger(r) || r < 1 || r > MAX_R) return null;
  if (!Number.isInteger(p) || p < 1 || p > MAX_P) return null;

  const salt = Buffer.from(rawSalt, 'base64');
  const key = Buffer.from(rawKey, 'base64');
  if (salt.length === 0 || key.length === 0) return null;

  return { params: { N, r, p }, salt, key };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return false;
  let candidate: Buffer;
  try {
    candidate = await derive(password, parsed.salt, parsed.params);
  } catch {
    return false;
  }
  if (candidate.length !== parsed.key.length) return false;
  return timingSafeEqual(candidate, parsed.key);
}

let dummy: Promise<string> | null = null;

/**
 * A throwaway hash verified when the username does not exist, so a bad
 * username costs the same wall-clock time as a bad password.
 */
export function dummyPasswordHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(24).toString('hex'));
  return dummy;
}

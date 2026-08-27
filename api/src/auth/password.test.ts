import { describe, it, expect } from 'vitest';
import {
  CURRENT_PARAMS,
  dummyPasswordHash,
  hashPassword,
  parsePasswordHash,
  verifyPassword,
} from './password.js';

const FAST = { N: 1024, r: 8, p: 1 };

describe('hashPassword', () => {
  it('produces a self-describing scrypt string', async () => {
    const stored = await hashPassword('correct horse battery', FAST);
    const parts = stored.split('$');
    expect(parts[0]).toBe('scrypt');
    expect(Number(parts[1])).toBe(FAST.N);
    expect(Number(parts[2])).toBe(FAST.r);
    expect(Number(parts[3])).toBe(FAST.p);
    expect(parts).toHaveLength(6);
  });

  it('never stores the plaintext', async () => {
    const stored = await hashPassword('hunter2-hunter2', FAST);
    expect(stored).not.toContain('hunter2');
  });

  it('salts each hash, so the same password hashes differently', async () => {
    const a = await hashPassword('same-password', FAST);
    const b = await hashPassword('same-password', FAST);
    expect(a).not.toBe(b);
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('defaults to the current cost parameters', async () => {
    const stored = await hashPassword('default-params-please');
    const parsed = parsePasswordHash(stored);
    expect(parsed?.params).toEqual(CURRENT_PARAMS);
  });
});

describe('verifyPassword', () => {
  it('accepts the right password', async () => {
    const stored = await hashPassword('s3cret-passphrase', FAST);
    expect(await verifyPassword('s3cret-passphrase', stored)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('s3cret-passphrase', FAST);
    expect(await verifyPassword('s3cret-passphras', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
    expect(await verifyPassword('S3CRET-PASSPHRASE', stored)).toBe(false);
  });

  it('verifies a hash made with older parameters', async () => {
    const stored = await hashPassword('legacy-cost-params', { N: 256, r: 8, p: 1 });
    expect(await verifyPassword('legacy-cost-params', stored)).toBe(true);
  });

  it('returns false for malformed stored hashes instead of throwing', async () => {
    for (const bad of [
      '',
      'not-a-hash',
      'scrypt$16384$8$1$onlyfiveparts',
      'bcrypt$16384$8$1$c2FsdA==$aGFzaA==',
      'scrypt$16385$8$1$c2FsdA==$aGFzaA==',
      'scrypt$16384$0$1$c2FsdA==$aGFzaA==',
      'scrypt$16384$8$1$$aGFzaA==',
      `scrypt$${1 << 21}$8$1$c2FsdA==$aGFzaA==`,
    ]) {
      expect(await verifyPassword('anything', bad)).toBe(false);
    }
  });

  it('rejects a hash whose key length was tampered with', async () => {
    const stored = await hashPassword('tamper-target-pw', FAST);
    const parts = stored.split('$');
    const truncated = Buffer.from(parts[5] as string, 'base64').subarray(0, 16);
    parts[5] = truncated.toString('base64');
    expect(await verifyPassword('tamper-target-pw', parts.join('$'))).toBe(false);
  });
});

describe('dummyPasswordHash', () => {
  it('is a valid parseable hash that no password matches', async () => {
    const stored = await dummyPasswordHash();
    expect(parsePasswordHash(stored)).not.toBeNull();
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('is memoised', async () => {
    expect(await dummyPasswordHash()).toBe(await dummyPasswordHash());
  });
});

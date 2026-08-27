import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  checkLoginAttempt,
  clearLoginAttempts,
  recordLoginFailure,
  resetLoginAttempts,
} from './rateLimit.js';

const IP = '10.0.0.1';
const T0 = 1_700_000_000_000;

beforeEach(() => {
  resetLoginAttempts();
});

describe('login rate limiting', () => {
  it('allows attempts from an unseen address', () => {
    expect(checkLoginAttempt(IP, T0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('allows the first four failures', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
      expect(recordLoginFailure(IP, T0 + i).allowed).toBe(true);
    }
    expect(checkLoginAttempt(IP, T0).allowed).toBe(true);
  });

  it('locks out on the fifth failure', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) recordLoginFailure(IP, T0 + i);
    const verdict = checkLoginAttempt(IP, T0 + MAX_FAILED_ATTEMPTS);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('releases the lock after the cooldown', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) recordLoginFailure(IP, T0);
    expect(checkLoginAttempt(IP, T0 + LOCKOUT_MS - 1).allowed).toBe(false);
    expect(checkLoginAttempt(IP, T0 + LOCKOUT_MS + 1).allowed).toBe(true);
  });

  it('is scoped per address', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) recordLoginFailure(IP, T0);
    expect(checkLoginAttempt('10.0.0.2', T0).allowed).toBe(true);
  });

  it('forgets failures older than the window', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) recordLoginFailure(IP, T0);
    const later = T0 + ATTEMPT_WINDOW_MS + 1;
    expect(recordLoginFailure(IP, later).allowed).toBe(true);
    expect(checkLoginAttempt(IP, later).allowed).toBe(true);
  });

  it('clears on a successful login', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) recordLoginFailure(IP, T0);
    clearLoginAttempts(IP);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
      expect(recordLoginFailure(IP, T0).allowed).toBe(true);
    }
  });
});

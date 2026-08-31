export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 60_000;
export const ATTEMPT_WINDOW_MS = 15 * 60_000;
const MAX_TRACKED_KEYS = 1000;

interface Attempt {
  failures: number;
  lastFailureAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, Attempt>();

function prune(now: number): void {
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil <= now && now - entry.lastFailureAt > ATTEMPT_WINDOW_MS) {
      attempts.delete(key);
    }
  }
  while (attempts.size > MAX_TRACKED_KEYS) {
    const oldest = attempts.keys().next();
    if (oldest.done) break;
    attempts.delete(oldest.value);
  }
}

export interface AttemptVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkLoginAttempt(key: string, now: number = Date.now()): AttemptVerdict {
  const entry = attempts.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string, now: number = Date.now()): AttemptVerdict {
  const existing = attempts.get(key);
  const stale = existing !== undefined && now - existing.lastFailureAt > ATTEMPT_WINDOW_MS;
  const failures = existing && !stale ? existing.failures + 1 : 1;
  const lockedUntil = failures >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0;

  attempts.delete(key);
  attempts.set(key, { failures, lastFailureAt: now, lockedUntil });
  prune(now);

  return {
    allowed: lockedUntil === 0,
    retryAfterSeconds: lockedUntil === 0 ? 0 : Math.ceil(LOCKOUT_MS / 1000),
  };
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}

export function resetLoginAttempts(): void {
  attempts.clear();
}

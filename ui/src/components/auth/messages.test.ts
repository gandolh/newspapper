import { describe, expect, it } from 'vitest';
import { authMessage, reasonMessage } from './messages';

describe('authMessage', () => {
  it('says "wrong username or password" at the login form and "current password" in settings', () => {
    expect(authMessage({ code: 'invalid_credentials' })).toBe('Wrong username or password.');
    expect(authMessage({ code: 'invalid_credentials' }, 'password')).toBe(
      'That is not your current password.',
    );
  });

  it('puts the lockout wait in the sentence', () => {
    expect(authMessage({ code: 'too_many_attempts', retryAfterSeconds: 42 })).toBe(
      'Too many attempts. Try again in 42 seconds.',
    );
    expect(authMessage({ code: 'too_many_attempts', retryAfterSeconds: 1 })).toMatch(/1 second\./);
    expect(authMessage({ code: 'too_many_attempts' })).toMatch(/a minute/);
  });

  it('gives access_denied the operator wording, and the Ward-down code its password advice', () => {
    expect(authMessage({ code: 'access_denied' })).toBe(
      'Ward did not let you in here. Ask the operator for access.',
    );
    expect(authMessage({ code: 'ward_unavailable' })).toMatch(/Sign in with your password/);
  });

  it('falls back to a generic line for a code it does not know', () => {
    expect(authMessage({ code: 'something_new' })).toBe('Something went wrong. Try again.');
  });
});

describe('reasonMessage', () => {
  it('words the two reasons a Ward session is refused, and ignores the rest', () => {
    expect(reasonMessage('ward_session_ended')).toBe('Your Ward session ended. Sign in again.');
    expect(reasonMessage('ward_unavailable')).toMatch(/unreachable/);
    expect(reasonMessage('session_check_failed')).toBeUndefined();
    expect(reasonMessage(null)).toBeUndefined();
  });
});

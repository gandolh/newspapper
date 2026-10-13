import type { AuthError } from '@/lib/auth';

/**
 * Every word the person reads about sign-in. The library supplies stable codes
 * and nothing else; this is the one place they become sentences, so the login
 * page, the tray and Settings cannot drift apart on what a code means.
 *
 * `context` is for the codes whose honest wording depends on where they came
 * from: a wrong password at the login form is "wrong username or password",
 * but in the change-password form it is "your current password".
 */
export type AuthContext = 'login' | 'password' | 'ward';

export function authMessage(error: AuthError, context: AuthContext = 'login'): string {
  switch (error.code) {
    case 'invalid_credentials':
      return context === 'password'
        ? 'That is not your current password.'
        : 'Wrong username or password.';
    case 'too_many_attempts': {
      const seconds = error.retryAfterSeconds;
      return seconds
        ? `Too many attempts. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`
        : 'Too many attempts. Try again in a minute.';
    }
    case 'network':
      return 'Could not reach the server. Check your connection and try again.';
    case 'invalid_request':
      return 'Fill in both fields.';
    case 'password_too_short':
      return 'That password is too short.';
    case 'password_too_long':
      return 'That password is too long.';
    case 'unauthorized':
      return 'Your session ended. Sign in again.';
    case 'cross_site':
      return 'That request came from another site, so it was refused.';

    case 'access_denied':
      return 'Ward did not let you in here. Ask the operator for access.';
    case 'ward_unavailable':
      return context === 'login'
        ? 'Ward is unreachable. Sign in with your password.'
        : 'Ward is unreachable. Try again in a moment.';
    case 'ward_misconfigured':
      return 'Ward refused this app’s credentials. That is for the operator to fix; sign in with your password.';
    case 'ward_session_ended':
      return 'Your Ward session ended. Sign in again.';
    case 'invalid_callback':
      return 'The Ward sign-in expired or did not verify. Try again.';
    case 'already_linked':
      return 'A Ward account is already linked to this user.';
    case 'ward_account_in_use':
      return 'That Ward account is already linked to another user here.';
    case 'ward_account_mismatch':
      return 'That was a different Ward account from the one linked here.';
    case 'not_linked':
      return 'No Ward account is linked.';
    case 'no_local_password':
      return 'Set a local password first, so you can still sign in without Ward.';
    case 'reauthentication_required':
      return 'Confirm with Ward first: it is more than ten minutes since you signed in with it.';
    default:
      return 'Something went wrong. Try again.';
  }
}

/**
 * The messages for a session `reason` (what a refused cookie said), or
 * `undefined` for a reason that needs none.
 */
export function reasonMessage(reason: string | null | undefined): string | undefined {
  if (!reason) return undefined;
  if (reason === 'ward_unavailable' || reason === 'ward_session_ended') {
    return authMessage({ code: reason }, 'login');
  }
  return undefined;
}

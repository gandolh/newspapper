import { Link } from '@/router';
import { useLogout, useSession } from '@/lib/auth';
import { withBase } from '@/lib/base';
import styles from './SessionMenu.module.css';

/**
 * Who is signed in, and the way out — the tray's session compartment.
 *
 * With no session it shows the way in: a link to the app's own login page.
 * Signing out ends this app's session only. Ending the Ward session as well
 * ("sign out of Ward too") is in Settings, where the Ward account is managed.
 *
 * `useSession` probes `GET /api/auth/session`, which is public and answers
 * `user: null` for a signed-out browser, so this component renders on every
 * page without the 401 redirect firing before the page it asked for has had a
 * chance to render anything.
 */
export default function SessionMenu() {
  const session = useSession();
  const { logout, pending } = useLogout();

  if (session.status !== 'signed_in') {
    // Nothing until the probe answers: no flash of "Sign in" on a signed-in page.
    if (session.status === 'loading') return null;
    return (
      <span className={styles.session}>
        <Link className={styles.signIn} href="/login">
          Sign in
        </Link>
      </span>
    );
  }

  async function signOut() {
    if (await logout()) window.location.assign(withBase('/login'));
  }

  return (
    <span className={styles.session}>
      <span className={styles.username} title={session.user.username}>
        {session.user.username}
      </span>
      <button type="button" className={styles.signOut} disabled={pending} onClick={signOut}>
        Sign out
      </button>
    </span>
  );
}

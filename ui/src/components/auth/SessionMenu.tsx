import { useEffect, useState } from 'react';
import { api, ApiError, LOGIN_PATH } from '@/lib/api';
import type { User } from '@/lib/types';
import styles from './SessionMenu.module.css';

/**
 * Who is signed in, and the way out — the tray's session compartment. The
 * tray is Astro-rendered and static, so the one thing on it that needs the
 * session lives here as its own island.
 *
 * With no session it shows the way in instead, which is what puts `/login`
 * in the tray alongside the four page routes.
 *
 * `skipAuthRedirect` on the /api/me probe: an expired session should not
 * bounce the login page itself, and every other island on the page already
 * redirects when its own first request comes back 401.
 */
export default function SessionMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api<{ user: User }>('/api/me', {
          skipAuthRedirect: true,
        });
        setUser(me.user);
      } catch (err) {
        if (!(err instanceof ApiError)) return;
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await api('/api/logout', { method: 'POST' });
    } catch {
      // A failed logout still means this browser should stop pretending.
    }
    window.location.assign(LOGIN_PATH);
  }

  if (!user) {
    if (!checked) return null;
    return (
      <span className={styles.session}>
        <a className={styles.signIn} href={LOGIN_PATH}>
          Sign in
        </a>
      </span>
    );
  }

  return (
    <span className={styles.session}>
      <span className={styles.username} title={user.username}>
        {user.username}
      </span>
      <button
        type="button"
        className={styles.signOut}
        onClick={() => void signOut()}
        disabled={signingOut}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </span>
  );
}

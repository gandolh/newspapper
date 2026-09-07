import { useEffect, useState } from 'react';
import { api, ApiError, WARD_ACCOUNT_PATH, wardLoginUrl } from '@/lib/api';
import type { User } from '@/lib/types';
import styles from './SessionMenu.module.css';

/**
 * Who is signed in, and the way out — the tray's session compartment. The
 * tray is Astro-rendered and static, so the one thing on it that needs the
 * session lives here as its own island.
 *
 * With no session it shows the way in instead — which is now a link **off this
 * app**, to Ward's login page, because newspapper has no login of its own.
 *
 * Signing out is likewise Ward's, and newspapper must not fake one: the session
 * belongs to the estate, so ending it here while atrium and prm still honoured
 * it would be a lie the cookie contradicts on the next request. The button
 * became a link to Ward's account page, where signing out actually revokes
 * something.
 *
 * `skipAuthRedirect` on the `/api/me` probe: this component renders on every
 * page, and without it a signed-out browser would be redirected by the tray
 * before the page it asked for had a chance to render anything.
 */
export default function SessionMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

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

  if (!user) {
    if (!checked) return null;
    return (
      <span className={styles.session}>
        <a className={styles.signIn} href={wardLoginUrl()}>
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
      {/* A link, not a button: signing out happens at Ward, which is where the
          session actually lives. */}
      <a className={styles.signOut} href={WARD_ACCOUNT_PATH}>
        Account
      </a>
    </span>
  );
}

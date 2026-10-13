/**
 * The only route outside the board: no tray, no sheet, just the form centred
 * on the paper. It is also the only route that renders without a session, by
 * design — every other one bounces through `lib/api.ts`'s 401 redirect.
 */
import { useEffect } from 'react';
import LoginIsland from '../components/auth/LoginIsland';
import styles from './Login.module.css';

export default function LoginPage() {
  useEffect(() => {
    document.title = 'Sign in — newspapper';
  }, []);

  return (
    <main className={styles['login-shell']}>
      <LoginIsland />
    </main>
  );
}

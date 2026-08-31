/**
 * The board — the shell every route but /login renders inside.
 *
 * Was `App.astro`. The two Astro-shaped things it carried are gone rather
 * than replaced: `<ClientRouter/>` and the tray's `transition:persist` both
 * existed to keep the tray mounted across a navigation, and in an SPA the
 * tray is simply never unmounted.
 */
import { useEffect, type ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import styles from './App.module.css';

export default function App({
  title = 'newspapper',
  width = 'default',
  children,
}: {
  title?: string;
  width?: 'default' | 'fluid';
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — newspapper`;
  }, [title]);

  const sheet = [styles.sheet, width === 'fluid' ? styles['sheet--fluid'] : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.board}>
      {/* The tray: a full-width strip across the top of the board. */}
      <Sidebar />

      <main className={styles.work}>
        <div className={sheet}>{children}</div>
      </main>
    </div>
  );
}

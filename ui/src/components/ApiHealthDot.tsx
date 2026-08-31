import { useEffect, useState } from 'react';
import { Mark } from './ui';
import styles from './ApiHealthDot.module.css';

type Status = 'loading' | 'online' | 'offline';

/**
 * Whether the API answers. Said as a mark — a tick and a word — not as a
 * coloured dot: a hue on its own is not a state in this system.
 */
export default function ApiHealthDot() {
  const [status, setStatus] = useState<Status>('loading');

  async function check() {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }

  useEffect(() => {
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => clearInterval(id);
  }, []);

  const label =
    status === 'online'
      ? 'API online'
      : status === 'offline'
        ? 'API offline'
        : 'Checking…';
  const word =
    status === 'online'
      ? 'API up'
      : status === 'offline'
        ? 'API down'
        : 'API …';

  return (
    <span className={styles.probe} title={label}>
      <Mark tone={status === 'offline' ? 'rubylith' : 'dim'} aria-label={label}>
        <span className={styles.label}>{word}</span>
      </Mark>
    </span>
  );
}

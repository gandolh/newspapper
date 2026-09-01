import { useEffect, useState } from 'react';
import { Mark } from './ui';
import styles from './ApiHealthDot.module.css';

type Status = 'up' | 'down';

/**
 * Whether the API answers. Said as a mark — a tick and a word — not as a
 * coloured dot: a hue on its own is not a state in this system.
 *
 * Two states, not three (DESIGN.md §5). A check in flight renders as *up*:
 * a state that resolves in milliseconds and cannot be acted on does not earn
 * a form here, and `loading` never had one — it shared `dim` with `online`,
 * so only the word ever told them apart.
 *
 * Below 640px — where the tray folds into two courses — the probe spends
 * width only when it has something to say: nothing when the API is up, the
 * tick and the full word when it is not. The word is the state; the tick is
 * 6 × 1px and can carry nothing on its own. The clipped-not-removed branch
 * in the stylesheet is what keeps the word in the accessibility tree at the
 * width where the sighted view gives it up.
 */
export default function ApiHealthDot() {
  const [status, setStatus] = useState<Status>('up');

  async function check() {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? 'up' : 'down');
    } catch {
      setStatus('down');
    }
  }

  useEffect(() => {
    // Kept as an effect. This is the case the rule's own message sanctions:
    // subscribing to an external system — /api/health, polled — where the
    // status is not knowable at render time. The first paint says *up* and
    // the mark changes only if a check fails, so nothing here is a
    // placeholder being corrected on the way to a real value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => clearInterval(id);
  }, []);

  const down = status === 'down';
  const label = down ? 'API offline' : 'API online';
  const word = down ? 'API down' : 'API up';

  return (
    <span className={[styles.probe, down ? '' : styles.up].filter(Boolean).join(' ')} title={label}>
      <Mark tone={down ? 'rubylith' : 'dim'} aria-label={label}>
        {word}
      </Mark>
    </span>
  );
}

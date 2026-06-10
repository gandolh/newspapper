import { useEffect, useState } from 'react';

type Status = 'loading' | 'online' | 'offline';

export default function ApiHealthDot() {
  const [status, setStatus] = useState<Status>('loading');

  async function check() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const dotColor =
    status === 'online'
      ? '#2e7d32'
      : status === 'offline'
        ? '#ba1a1a'
        : '#8b716b';

  const label = status === 'online' ? 'API online' : status === 'offline' ? 'API offline' : 'Checking…';

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--muted)',
        padding: '0 4px',
      }}
      aria-label={label}
      title={label}
    >
      <span
        style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          transition: 'background-color 0.3s ease',
        }}
      />
      <span>{label}</span>
    </span>
  );
}

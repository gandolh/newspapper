import { useState } from 'react';
import { Button, Card, Input } from '../ui';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';
import styles from './LoginIsland.module.css';

function nextPath(): string {
  if (typeof window === 'undefined') return '/';
  const raw = new URLSearchParams(window.location.search).get('next');
  if (!raw) return '/';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export default function LoginIsland() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api<{ user: User }>('/api/login', {
        method: 'POST',
        json: { username, password },
        skipAuthRedirect: true,
      });
      window.location.assign(nextPath());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>newspapper</h1>
      <p className={styles.tagline}>Sign in to continue.</p>

      <Card padding="md">
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Input
            label="Username"
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button className={styles.submit} type="submit" loading={busy}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

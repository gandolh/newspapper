import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Spinner,
  ToastProvider,
  useToast,
} from '../ui';
import { api } from '@/lib/api';
import type { Settings } from '@/lib/types';
import styles from './SettingsIsland.module.css';

/** `GET /api/themes` — `name` is the id on disk, `tokens.name` the display name. */
interface ThemeItem {
  name: string;
  tokens: { name: string; colors: Record<string, string> } | null;
}

function ThemeSection() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultTheme, setDefaultTheme] = useState('');
  const [themes, setThemes] = useState<ThemeItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, themeList] = await Promise.all([
        api<Settings>('/api/settings'),
        api<ThemeItem[]>('/api/themes'),
      ]);
      setThemes(themeList.filter((t) => t.tokens !== null));
      setDefaultTheme(settings.defaultTheme);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/settings', { method: 'PUT', json: { defaultTheme } });
      addToast('Default theme saved', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className={styles.loading}>
          <Spinner size={24} color="var(--primary)" />
        </div>
      </Card>
    );
  }

  const selected = themes.find((t) => t.name === defaultTheme);

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <h2 className={styles.sectionTitle}>Theme</h2>
        <p className={styles.sectionHint}>
          The theme a new post starts on. The three warm-industrial palettes are identical apart from
          their accent colour, so that swatch is the whole difference.
        </p>

        <div className={styles.themeRow}>
          <Select
            label="Default theme"
            options={themes.map((t) => ({ value: t.name, label: t.tokens?.name ?? t.name }))}
            value={defaultTheme}
            onValueChange={setDefaultTheme}
            className={styles.themeSelect}
          />
          <span
            className={styles.swatch}
            style={{ background: selected?.tokens?.colors['primary'] ?? 'transparent' }}
            aria-hidden="true"
          />
          <code className={styles.swatchValue}>{selected?.tokens?.colors['primary'] ?? '—'}</code>
        </div>

        <div className={styles.formActions}>
          <Button type="submit" loading={saving} disabled={!defaultTheme}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api('/api/password', { method: 'POST', json: { currentPassword, newPassword } });
      addToast('Password changed', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <h2 className={styles.sectionTitle}>Password</h2>
        <p className={styles.sectionHint}>
          Changing it signs this browser back in with a fresh cookie; any other browser is signed out.
        </p>

        <div className={styles.fields}>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={error ?? undefined}
          />
        </div>

        <div className={styles.formActions}>
          <Button
            type="submit"
            variant="secondary"
            loading={saving}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Settings" subtitle="The default a new post starts from, and this account." />
      <div className={styles.sections}>
        <ThemeSection />
        <PasswordSection />
      </div>
    </div>
  );
}

export default function SettingsIsland() {
  return (
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}

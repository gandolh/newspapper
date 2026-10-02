import { useCallback, useEffect, useState } from 'react';
import { Button, Card, PageHeader, Select, Skeleton, ToastProvider, useToast } from '../ui';
import { api, WARD_ACCOUNT_PATH } from '@/lib/api';
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
    // Kept as an effect: load on mount. The settings and the theme list are
    // both server state, so there is nothing to derive and nothing to lift —
    // the flag this trips is `setLoading(false)` in `load`'s `finally`, which
    // is what ends the skeleton.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <Skeleton height={26} width="40%" />
          <Skeleton height={26} />
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
          The theme a new post starts on. The three warm-industrial palettes are identical apart
          from their accent colour, so that swatch is the whole difference.
        </p>

        <div className={styles.themeRow}>
          <Select
            label="Default theme"
            options={themes.map((t) => ({
              value: t.name,
              label: t.tokens?.name ?? t.name,
            }))}
            value={defaultTheme}
            onValueChange={setDefaultTheme}
            className={styles.themeSelect}
          />
          <span
            className={styles.swatch}
            style={{
              background: selected?.tokens?.colors['primary'] ?? 'transparent',
            }}
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

/**
 * The account half of Settings. There is no password here to change: identity
 * is Ward's, and so are the password, sign-in and sign-out, on Ward's account
 * page. This used to be a password form posting to the password route the
 * Ward move deleted, so it invited people to type their password into the wrong
 * app and then 404ed. Origin-absolute link, like `SessionMenu`'s: Ward is a
 * different app on the same origin, so it must not carry this app's base.
 */
function AccountSection() {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>Account</h2>
      <p className={styles.sectionHint}>
        Your password and sign-in are managed by Ward, which signs you in to every app on this site.{' '}
        <a href={WARD_ACCOUNT_PATH}>Open your Ward account</a> to change your password or sign out.
      </p>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        subtitle="The default a new post starts from, and this account."
      />
      <div className={styles.sections}>
        <ThemeSection />
        <AccountSection />
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

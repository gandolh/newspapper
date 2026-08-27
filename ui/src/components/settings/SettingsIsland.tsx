import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  ToastProvider,
  useToast,
} from '../ui';
import { api } from '@/lib/api';
import type { Settings } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeItem {
  name: string;
}

// ---------------------------------------------------------------------------
// SettingsPage (inner — needs toast context)
// ---------------------------------------------------------------------------

function SettingsPage() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [defaultTheme, setDefaultTheme] = useState('');

  // Loaded data
  const [themes, setThemes] = useState<ThemeItem[]>([]);

  // Load initial settings + themes
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, themeList] = await Promise.all([
        api<Settings>('/api/settings'),
        api<ThemeItem[]>('/api/themes').catch(() => [] as ThemeItem[]),
      ]);
      setDefaultTheme(settings.defaultTheme);
      setThemes(themeList);
    } catch {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Save settings
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/settings', {
        method: 'PUT',
        json: {
          defaultTheme,
        },
      });
      addToast('Settings saved', 'success');
      // Reload to get fresh state
      await loadAll();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <Spinner size={28} color="var(--primary)" />
      </div>
    );
  }

  const themeOptions = themes.map((t) => ({ value: t.name, label: t.name }));

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 'var(--content-narrow)', marginInline: 'auto' }} noValidate>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <PageHeader
          title="Settings"
          subtitle="Configure your generation defaults."
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* --- Generation card --- */}
        <Card>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            Generation
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {themeOptions.length > 0 ? (
              <Select
                label="Default theme"
                options={themeOptions}
                value={defaultTheme}
                onValueChange={(v) => setDefaultTheme(v)}
                hint="Theme applied when running the pipeline"
              />
            ) : (
              <Input
                label="Default theme"
                placeholder="warm-industrial"
                value={defaultTheme}
                onChange={(e) => setDefaultTheme(e.target.value)}
                hint="Theme applied when running the pipeline"
              />
            )}
          </div>
        </Card>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Export (wrapped in ToastProvider)
// ---------------------------------------------------------------------------

export default function SettingsIsland() {
  return (
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}

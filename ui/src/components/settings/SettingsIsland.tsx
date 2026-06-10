import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  ToastProvider,
  useToast,
} from '../ui';
import { api, ApiError } from '../../lib/api';
import type { Settings } from '../../lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  ok: boolean;
  error?: string;
  models?: string[];
}

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
  const [testing, setTesting] = useState(false);

  // Form state
  const [ollamaHost, setOllamaHost] = useState('');
  const [ollamaApiKey, setOllamaApiKey] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');
  const [defaultTheme, setDefaultTheme] = useState('');

  // Loaded data
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeItem[]>([]);

  // Test result
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Load initial settings + themes + models
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, themeList] = await Promise.all([
        api<Settings>('/api/settings'),
        api<ThemeItem[]>('/api/themes').catch(() => [] as ThemeItem[]),
      ]);
      setOllamaHost(settings.ollamaHost);
      setOllamaApiKey(settings.ollamaApiKey); // may be '***'
      setOllamaModel(settings.ollamaModel);
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

  // Load models separately (can fail independently)
  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const data = await api<string[]>('/api/models');
      setModels(data);
    } catch (err) {
      setModelsError((err as Error).message);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadModels();
    }
  }, [loading, loadModels]);

  // Test connection
  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api<TestResult>('/api/settings/test', { method: 'POST' });
      setTestResult(result);
      if (result.ok) {
        const count = result.models?.length ?? 0;
        addToast(`Connected — ${count} model${count !== 1 ? 's' : ''} available`, 'success');
      }
    } catch (err) {
      setTestResult({ ok: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }

  // Save settings
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/settings', {
        method: 'PUT',
        json: {
          ollamaHost: ollamaHost.trim(),
          ollamaApiKey,   // send '***' back unchanged to preserve stored key
          ollamaModel: ollamaModel.trim(),
          defaultTheme,
        },
      });
      addToast('Settings saved', 'success');
      // Reload to get fresh masked state
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

  const modelOptions = models.map((m) => ({ value: m, label: m }));
  const themeOptions = themes.map((t) => ({ value: t.name, label: t.name }));

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 680 }} noValidate>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--on-surface)',
          }}
        >
          Settings
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--muted)' }}>
          Configure your Ollama connection and generation defaults.
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--muted)',
            background: 'var(--surface-low)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--outline-variant)',
          }}
        >
          Values from <code>.env</code> are used until overridden here.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* --- Ollama connection card --- */}
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
            Ollama connection
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Host"
              placeholder="http://localhost:11434 or https://ollama.com"
              value={ollamaHost}
              onChange={(e) => setOllamaHost(e.target.value)}
              hint="The base URL of your Ollama instance"
            />

            <Input
              label="API Key"
              type="password"
              placeholder="Leave '***' to keep stored key"
              value={ollamaApiKey}
              onChange={(e) => setOllamaApiKey(e.target.value)}
              hint="Only needed for Ollama Cloud. Leave *** to keep the existing stored key."
            />
          </div>

          {/* Test result */}
          {testResult && !testResult.ok && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: 'var(--error-container)',
                color: 'var(--error)',
                fontSize: 13,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontWeight: 700, flexShrink: 0 }}>✕</span>
              <span>{testResult.error ?? 'Connection failed'}</span>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Button type="button" variant="secondary" size="sm" loading={testing} onClick={handleTest}>
              Test connection
            </Button>
          </div>
        </Card>

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
            {/* Model — Select if models loaded, fallback to Input */}
            {modelsError || models.length === 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      label="Model"
                      placeholder="llama3.2:1b"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      hint={
                        modelsError
                          ? `Could not fetch model list: ${modelsError}. Enter a model name manually.`
                          : modelsLoading
                          ? 'Loading models…'
                          : 'No models found — enter a model name manually'
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={modelsLoading}
                    onClick={loadModels}
                    style={{ marginBottom: modelsError ? 28 : 20, flexShrink: 0 }}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Model"
                    options={modelOptions}
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    hint="Ollama model used for composition"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={modelsLoading}
                  onClick={loadModels}
                  style={{ marginBottom: 20, flexShrink: 0 }}
                >
                  Refresh
                </Button>
              </div>
            )}

            {themeOptions.length > 0 ? (
              <Select
                label="Default theme"
                options={themeOptions}
                value={defaultTheme}
                onChange={(e) => setDefaultTheme(e.target.value)}
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

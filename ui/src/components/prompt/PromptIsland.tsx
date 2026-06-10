import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Card,
  Badge,
  Spinner,
  ToastProvider,
  useToast,
  ConfirmDialog,
} from '../ui';
import { api, ApiError } from '@/lib/api';
import type { PostPayload, SlideBlock } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptData {
  prompt: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// SlidePreview
// ---------------------------------------------------------------------------

function SlidePreview({ slide, index }: { slide: SlideBlock; index: number }) {
  const fields: Array<{ label: string; value: string | string[] }> = [];

  if ('text' in slide) fields.push({ label: 'text', value: slide.text });
  if ('kicker' in slide && slide.kicker) fields.push({ label: 'kicker', value: slide.kicker });
  if ('heading' in slide) fields.push({ label: 'heading', value: slide.heading });
  if ('body' in slide && typeof slide.body === 'string') {
    fields.push({ label: 'body', value: slide.body });
  }
  if ('items' in slide && Array.isArray(slide.items)) {
    fields.push({ label: 'items', value: slide.items });
  }
  if ('left' in slide) {
    fields.push({ label: 'left', value: `${slide.left.label}: ${slide.left.body}` });
    fields.push({ label: 'right', value: `${slide.right.label}: ${slide.right.body}` });
  }
  if ('quote' in slide) fields.push({ label: 'quote', value: slide.quote });
  if ('attribution' in slide) fields.push({ label: 'attribution', value: slide.attribution });

  return (
    <Card padding="sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            background: 'var(--surface-low)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {index + 1}
        </span>
        <Badge variant="muted">{slide.type}</Badge>
        <Badge variant="primary">{slide.variant}</Badge>
      </div>
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
        {fields.map(({ label, value }) => (
          <div
            key={label}
            style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, fontSize: 13 }}
          >
            <dt
              style={{
                fontWeight: 600,
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                paddingTop: 2,
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0, color: 'var(--on-surface)', lineHeight: 1.5 }}>
              {Array.isArray(value) ? (
                <ul style={{ listStyle: 'disc', paddingLeft: 16, margin: 0 }}>
                  {value.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PromptPage (inner — needs toast context)
// ---------------------------------------------------------------------------

function PromptPage() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const [promptText, setPromptText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [testResult, setTestResult] = useState<PostPayload | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const isDirty = promptText !== savedText;

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  // Load prompt
  const loadPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<PromptData>('/api/prompt');
      setPromptText(data.prompt);
      setSavedText(data.prompt);
      setIsDefault(data.isDefault);
    } catch {
      addToast('Failed to load prompt', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadPrompt();
  }, [loadPrompt]);

  // Save
  async function handleSave() {
    setSaving(true);
    try {
      const data = await api<PromptData>('/api/prompt', {
        method: 'PUT',
        json: { prompt: promptText },
      });
      setSavedText(data.prompt);
      setIsDefault(data.isDefault);
      addToast('Prompt saved', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Reset
  async function handleReset() {
    setResetting(true);
    try {
      const data = await api<PromptData>('/api/prompt/reset', { method: 'POST' });
      setPromptText(data.prompt);
      setSavedText(data.prompt);
      setIsDefault(data.isDefault);
      setConfirmResetOpen(false);
      addToast('Prompt reset to default', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setResetting(false);
    }
  }

  // Test compose
  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await api<PostPayload>('/api/prompt/test', { method: 'POST', json: {} });
      setTestResult(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setTestError(
          `${err.message} — no articles scraped today. Visit the Create page first to scrape today's feeds.`,
        );
      } else {
        setTestError((err as Error).message);
      }
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <Spinner size={28} color="var(--primary)" />
      </div>
    );
  }

  const charCount = promptText.length;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--on-surface)',
            }}
          >
            Prompt
          </h1>
          {isDefault && <Badge variant="muted">default</Badge>}
          {isDirty && <Badge variant="warning">unsaved</Badge>}
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          This is the system prompt that turns today's articles into slides — edit to tune voice,
          tone, and slide-type choices.
        </p>
      </div>

      {/* Prompt editor */}
      <Card padding="none">
        <div style={{ padding: '16px 16px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              System prompt
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {charCount.toLocaleString()} chars
            </span>
          </div>
        </div>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          spellCheck={false}
          style={{
            display: 'block',
            width: '100%',
            minHeight: '70vh',
            padding: '12px 16px 16px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--on-surface)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </Card>

      {/* Action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmResetOpen(true)}
          disabled={isDefault && !isDirty}
        >
          Reset to default
        </Button>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" loading={testing} onClick={handleTest}>
            Test on today's articles
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </div>

      {/* Test result */}
      {(testResult || testError || testing) && (
        <div style={{ marginTop: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 14,
            }}
          >
            Test result
          </h2>

          {testing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--muted)',
                fontSize: 14,
                padding: '16px',
              }}
            >
              <Spinner size={18} color="var(--primary)" />
              Running compose…
            </div>
          )}

          {testError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                background: 'var(--error-container)',
                color: 'var(--error)',
                fontSize: 13,
                lineHeight: 1.6,
                display: 'flex',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 700, flexShrink: 0 }}>✕</span>
              <span>{testError}</span>
            </div>
          )}

          {testResult && !testing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--on-surface)',
                  }}
                >
                  {testResult.title}
                </h3>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Badge variant="muted">{testResult.theme}</Badge>
                  <Badge variant="default">{testResult.slides.length} slides</Badge>
                </div>
              </div>
              {testResult.slides.map((slide, i) => (
                <SlidePreview key={i} slide={slide} index={i} />
              ))}
              {testResult.caption && (
                <Card padding="sm">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Caption
                  </span>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }}>{testResult.caption}</p>
                </Card>
              )}
              {testResult.hashtags && testResult.hashtags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {testResult.hashtags.map((tag) => (
                    <Badge key={tag} variant="muted">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reset confirm */}
      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleReset}
        title="Reset prompt?"
        message="This will restore the built-in default prompt and discard any customizations."
        confirmLabel="Reset"
        cancelLabel="Keep my prompt"
        variant="primary"
        loading={resetting}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export (wrapped in ToastProvider)
// ---------------------------------------------------------------------------

export default function PromptIsland() {
  return (
    <ToastProvider>
      <PromptPage />
    </ToastProvider>
  );
}

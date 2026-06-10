/**
 * EditorStep — Wave 3B: three-zone slide editor with live previews and slide AI.
 *
 * Layout:
 *   [SlideList 220px] | [Center preview flex:1] | [EditPanel 320px]
 *
 * Contract (called by wizard/Wizard.tsx):
 *   <EditorStep post={post} onPostUpdated={fn} onNext={fn} onBack={fn} />
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { PostPayload, PostRow, SlideBlock, TemplateDoc } from '../../lib/types';
import { api } from '../../lib/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import PreviewFrame from './PreviewFrame';
import SlideList from './SlideList';
import EditPanel from './EditPanel';
import { slideToData } from './slideUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ActionToastEntry {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// ActionToast overlay (kit Toast doesn't support action buttons)
// ---------------------------------------------------------------------------

function ActionToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: ActionToastEntry[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      role="log"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const bg =
          t.variant === 'success'
            ? 'var(--success-container)'
            : t.variant === 'error'
              ? 'var(--error-container)'
              : 'var(--secondary-container)';
        const fg =
          t.variant === 'success'
            ? 'var(--success)'
            : t.variant === 'error'
              ? 'var(--error)'
              : 'var(--secondary)';
        return (
          <div
            key={t.id}
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: bg,
              color: fg,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
              maxWidth: 320,
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.();
                  onDismiss(t.id);
                }}
                style={{
                  background: 'none',
                  border: `1px solid ${fg}`,
                  borderRadius: 4,
                  color: fg,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: fg,
                fontSize: 14,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditorStep
// ---------------------------------------------------------------------------

export function EditorStep({
  post,
  onPostUpdated,
  onNext,
  onBack,
}: {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;
  onNext: () => void;
  onBack: () => void;
}): ReactElement {
  // ------ state ------
  const [payload, setPayload] = useState<PostPayload>(() => ({
    ...post.payload,
    slides: post.payload.slides.map((s) => ({ ...s })),
  }));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // action toasts (support undo action)
  const [actionToasts, setActionToasts] = useState<ActionToastEntry[]>([]);

  // kit toast (used for simple notifications only from SlideList which doesn't need undo)
  const { addToast } = useToast();

  // debounce timer refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushResolveRef = useRef<(() => void) | null>(null);

  // ------ load templates ------
  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    api<TemplateDoc[]>(`/api/templates?theme=${encodeURIComponent(payload.theme)}`)
      .then((docs) => {
        if (!cancelled) {
          setTemplates(docs);
          setTemplatesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplatesLoading(false);
          addToast('Failed to load templates', 'error');
        }
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.theme]);

  // ------ autosave ------
  const doSave = useCallback(
    async (next: PostPayload) => {
      setSaveState('saving');
      try {
        const updated = await api<PostRow>(`/api/posts/${post.id}`, {
          method: 'PUT',
          json: { payload: next },
        });
        setSaveState('saved');
        onPostUpdated(updated);
        // auto-clear "saved" after 2s
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch {
        setSaveState('error');
      }
    },
    [post.id, onPostUpdated],
  );

  // ------ update helper (single mutation point) ------
  const update = useCallback(
    (fn: (prev: PostPayload) => PostPayload) => {
      setPayload((prev) => {
        const next = fn(prev);

        // clear previous debounce
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(async () => {
          await doSave(next);
          if (flushResolveRef.current) {
            flushResolveRef.current();
            flushResolveRef.current = null;
          }
        }, 800);

        return next;
      });
    },
    [doSave],
  );

  // flush pending save (called before onNext)
  const flushSave = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!saveTimerRef.current) {
        resolve();
        return;
      }
      // store resolve so the timer callback fires it
      flushResolveRef.current = resolve;
    });
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ------ action toast helpers ------
  const showActionToast = useCallback(
    (
      message: string,
      variant: 'success' | 'error' | 'info' = 'info',
      onAction?: () => void,
      actionLabel?: string,
      duration = 8000,
    ) => {
      const id = `at-${Date.now()}-${Math.random()}`;
      const entry: ActionToastEntry = {
        id,
        message,
        variant,
        actionLabel,
        onAction,
        expiresAt: Date.now() + duration,
      };
      setActionToasts((prev) => [...prev, entry]);
      setTimeout(() => {
        setActionToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  function dismissActionToast(id: string) {
    setActionToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ------ slide mutations ------
  function updateSlide(index: number, updated: SlideBlock) {
    update((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? updated : s)),
    }));
  }

  function handleSlideChange(updated: SlideBlock) {
    updateSlide(selectedIndex, updated);
  }

  // Called from EditPanel when AI undo is triggered
  function handleUndo(_prev: SlideBlock) {
    // The action is already passed as the onAction in showActionToast; this is a no-op
  }

  function handleReorder(from: number, to: number) {
    update((prev) => {
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...prev, slides };
    });
    // keep selection following the moved slide
    setSelectedIndex(to);
  }

  function handleDelete(index: number) {
    update((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }));
    setSelectedIndex((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
  }

  function handleAdd(slide: SlideBlock, afterIndex: number) {
    update((prev) => {
      const slides = [...prev.slides];
      slides.splice(afterIndex + 1, 0, slide);
      return { ...prev, slides };
    });
    setSelectedIndex(afterIndex + 1);
  }

  // ------ selected slide ------
  const slides = payload.slides;
  const safeIndex = Math.min(selectedIndex, slides.length - 1);
  const selectedSlide = slides[safeIndex];

  // ------ center preview full-size ------
  function openFullSize() {
    if (!selectedSlide) return;
    const body = JSON.stringify({
      templateId: selectedSlide.variant,
      data: slideToData(selectedSlide),
      theme: payload.theme,
      index: safeIndex + 1,
      total: slides.length,
    });
    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
      .then((r) => r.text())
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => {
        addToast('Preview unavailable', 'error');
      });
  }

  // ------ loading state ------
  if (templatesLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 12,
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        <Spinner size={20} color="var(--primary)" />
        Loading templates…
      </div>
    );
  }

  // ------ save indicator ------
  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed — Retry'
          : null;

  const saveLabelColor =
    saveState === 'error'
      ? 'var(--error)'
      : saveState === 'saved'
        ? 'var(--success)'
        : 'var(--muted)';

  // ------ render ------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--surface-card)',
        }}
      >
        {/* Inline title edit */}
        <input
          type="text"
          value={payload.title}
          onChange={(e) =>
            update((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Post title"
          aria-label="Post title"
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font-family)',
            color: 'var(--on-surface)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '2px 0',
            borderBottom: '1px solid transparent',
            transition: 'border-color 0.12s',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderBottomColor = 'var(--primary)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderBottomColor = 'transparent')
          }
        />

        {/* Save state indicator */}
        {saveLabel && (
          <span
            style={{ fontSize: 12, color: saveLabelColor, whiteSpace: 'nowrap' }}
            aria-live="polite"
          >
            {saveState === 'saving' && (
              <Spinner size={10} color="var(--muted)" />
            )}{' '}
            {saveLabel}
          </span>
        )}
        {saveState === 'error' && (
          <button
            type="button"
            onClick={() => doSave(payload)}
            style={{
              fontSize: 12,
              color: 'var(--error)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Retry
          </button>
        )}
      </div>

      {/* ── Three-zone body ── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left — slide list */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            overflowY: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-low)',
          }}
        >
          <SlideList
            slides={slides}
            selectedIndex={safeIndex}
            theme={payload.theme}
            templates={templates}
            onSelect={setSelectedIndex}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onAdd={handleAdd}
            onToast={(msg, variant) => addToast(msg, variant)}
          />
        </div>

        {/* Center — large preview */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '20px 16px',
            background: 'var(--surface-container)',
            gap: 12,
          }}
        >
          {selectedSlide ? (
            <>
              {/* Slide counter */}
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                SLIDE {safeIndex + 1} / {slides.length}
              </div>

              {/* Preview frame — scales to fit ~560px max */}
              <CenterPreview
                slide={selectedSlide}
                theme={payload.theme}
                index={safeIndex}
                total={slides.length}
              />

              {/* Full size link */}
              <button
                type="button"
                onClick={openFullSize}
                style={{
                  fontSize: 12,
                  color: 'var(--primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 0',
                  textDecoration: 'underline',
                }}
              >
                Open full size ↗
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>
              No slide selected
            </span>
          )}
        </div>

        {/* Right — edit panel */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '16px',
            background: 'var(--surface-card)',
          }}
        >
          {selectedSlide ? (
            <EditPanel
              key={safeIndex}
              slide={selectedSlide}
              slideIndex={safeIndex}
              templates={templates}
              onChange={handleSlideChange}
              onUndo={handleUndo}
              onToast={showActionToast}
            />
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Select a slide to edit.
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--surface-card)',
          gap: 12,
        }}
      >
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            await flushSave();
            onNext();
          }}
        >
          Export →
        </Button>
      </div>

      {/* Action toasts (with undo buttons) */}
      <ActionToastRegion toasts={actionToasts} onDismiss={dismissActionToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CenterPreview — sizes the preview to fit the available area
// ---------------------------------------------------------------------------

function CenterPreview({
  slide,
  theme,
  index,
  total,
}: {
  slide: SlideBlock;
  theme: string;
  index: number;
  total: number;
}) {
  const data = slideToData(slide);
  // Target ~520px display size inside a 1080px frame → scale ≈ 0.48
  // We cap at 560px display, so scale = 560/1080 ≈ 0.519
  const scale = 560 / 1080;

  return (
    <PreviewFrame
      templateId={slide.variant}
      data={data}
      theme={theme}
      index={index + 1}
      total={total}
      scale={scale}
      debounce={500}
    />
  );
}

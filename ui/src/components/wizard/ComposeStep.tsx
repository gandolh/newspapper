import { useState, useEffect, useRef, useCallback } from 'react';
import { sse } from '@/lib/api';
import type { PostRow, SlideBlock } from '@/lib/types';
import { Button, Badge, Card, Spinner, ConfirmDialog, useToast } from '../ui';
import styles from './ComposeStep.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cycle of status messages shown while waiting for the LLM */
const WAITING_LINES = [
  'Sending articles to Ollama…',
  'Crafting slide structure…',
  'Writing headlines…',
  'Polishing body copy…',
  'Almost there…',
];

function firstText(slide: SlideBlock): string {
  if (slide.type === 'title') return slide.text;
  if (slide.type === 'body') return slide.heading;
  if (slide.type === 'quote') return slide.quote;
  return '';
}

function slideVariantLabel(variant: string): string {
  // e.g. 'body-list' → 'list', 'title-main' → 'main'
  const parts = variant.split('-');
  return parts[parts.length - 1] ?? variant;
}

/** Is the error message likely about Ollama connectivity / auth? */
function looksLikeConnectionError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('connect') ||
    lower.includes('econnrefused') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('ollama')
  );
}

// ---------------------------------------------------------------------------
// ComposeStep
// ---------------------------------------------------------------------------

export interface ComposeStepProps {
  articleIds: number[];
  onDone: (post: PostRow) => void;
  onBack: () => void;
}

export function ComposeStep({ articleIds, onDone, onBack }: ComposeStepProps) {
  const [phase, setPhase] = useState<'composing' | 'success' | 'error'>('composing');
  const [post, setPost] = useState<PostRow | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [stageText, setStageText] = useState(WAITING_LINES[0]);
  const [modelName, setModelName] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const waitLineRef = useRef(0);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addToast } = useToast();

  const runCompose = useCallback(async () => {
    setPhase('composing');
    setErrorMessage('');
    setStageText(WAITING_LINES[0]);
    waitLineRef.current = 0;

    // Cycle waiting text every 4 seconds
    waitTimerRef.current = setInterval(() => {
      waitLineRef.current = (waitLineRef.current + 1) % WAITING_LINES.length;
      setStageText(WAITING_LINES[waitLineRef.current]);
    }, 4000);

    abortRef.current = new AbortController();

    try {
      await sse(
        '/api/compose',
        { articleIds },
        {
          signal: abortRef.current.signal,
          onEvent: (event, data) => {
            if (event === 'progress') {
              const e = data as { stage?: string; model?: string };
              if (e.stage) setStageText(e.stage);
              if (e.model) setModelName(e.model);
            } else if (event === 'done') {
              const row = data as PostRow;
              if (waitTimerRef.current) clearInterval(waitTimerRef.current);
              setPost(row);
              setPhase('success');
            }
          },
        },
      );
    } catch (err) {
      if (waitTimerRef.current) clearInterval(waitTimerRef.current);
      const msg = (err as Error).message ?? 'Unknown error';
      setErrorMessage(msg);
      setPhase('error');
    }
  }, [articleIds]);

  // Auto-start on mount
  useEffect(() => {
    runCompose();
    return () => {
      abortRef.current?.abort();
      if (waitTimerRef.current) clearInterval(waitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegenerate() {
    setConfirmRegen(false);
    setPost(null);
    runCompose();
  }

  // ---- Composing phase ----
  if (phase === 'composing') {
    return (
      <div className={styles.root}>
        <div className={styles.composingPanel}>
          <Spinner size={40} color="var(--primary)" />
          <div className={styles.composingText}>
            <h2 className={styles.composingTitle}>Composing your post…</h2>
            <p className={styles.stageText}>{stageText}</p>
          </div>
          <div className={styles.composingMeta}>
            <Badge variant="muted">{articleIds.length} article{articleIds.length !== 1 ? 's' : ''}</Badge>
            {modelName && <Badge variant="default">{modelName}</Badge>}
          </div>
          <p className={styles.composingHint}>
            This can take up to a minute on a small model. Hang tight.
          </p>
        </div>
      </div>
    );
  }

  // ---- Error phase ----
  if (phase === 'error') {
    return (
      <div className={styles.root}>
        <Card padding="md" className={styles.errorPanel}>
          <div className={styles.errorIcon} aria-hidden="true">✕</div>
          <h2 className={styles.errorTitle}>Compose failed</h2>
          <p className={styles.errorMessage}>{errorMessage}</p>
          {looksLikeConnectionError(errorMessage) && (
            <p className={styles.errorHint}>
              Looks like Ollama may not be reachable.{' '}
              <a href="/settings" className={styles.settingsLink}>
                Check your Ollama settings →
              </a>
            </p>
          )}
          <div className={styles.errorActions}>
            <Button variant="ghost" onClick={onBack}>
              ← Back to articles
            </Button>
            <Button onClick={() => runCompose()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Success phase ----
  if (!post) return null;

  const slides = post.payload?.slides ?? [];

  return (
    <div className={styles.root}>
      <ConfirmDialog
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={handleRegenerate}
        title="Regenerate post?"
        message="This will send the same articles to the AI again and create a new draft — the current draft is not deleted but will no longer be the active one."
        confirmLabel="Regenerate"
        cancelLabel="Keep this draft"
        variant="primary"
      />

      <div className={styles.successHeader}>
        <div className={styles.successCheck} aria-hidden="true">✓</div>
        <div>
          <h2 className={styles.successTitle}>{post.payload?.title ?? post.title}</h2>
          <div className={styles.successMeta}>
            <Badge variant="success">{slides.length} slides</Badge>
            <Badge variant="muted">{post.theme}</Badge>
          </div>
        </div>
      </div>

      {/* Slide placards */}
      {slides.length > 0 && (
        <div className={styles.placardStrip}>
          {slides.map((slide, i) => (
            <div key={i} className={styles.placard}>
              <div className={styles.placardBadge}>
                <Badge variant="muted">{slideVariantLabel(slide.variant)}</Badge>
              </div>
              <div className={styles.placardText}>
                {firstText(slide) || <em className={styles.placardEmpty}>—</em>}
              </div>
              <div className={styles.placardNum}>{i + 1}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className={styles.successActions}>
        <Button variant="ghost" onClick={() => setConfirmRegen(true)}>
          Regenerate
        </Button>
        <Button size="lg" onClick={() => onDone(post)}>
          Edit slides →
        </Button>
      </div>
    </div>
  );
}

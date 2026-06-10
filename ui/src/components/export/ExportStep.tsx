import { useState, useCallback, useRef } from 'react';
import {
  Button,
  Card,
  Modal,
  ToastProvider,
  useToast,
  ProgressBar,
  Spinner,
  Textarea,
} from '../ui';
import { api, sse } from '../../lib/api';
import type { PostRow, PostPayload } from '../../lib/types';
import styles from './ExportStep.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RenderDonePayload {
  post: PostRow;
  files: string[];
}

interface ProgressPayload {
  done: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive PNG URLs from an outputDir like "output/2026-06-10-1" and slide count */
function deriveSlideUrls(outputDir: string, slideCount: number): string[] {
  // outputDir may be absolute path or relative — extract the basename
  const parts = outputDir.replace(/\\/g, '/').split('/');
  const dirName = parts[parts.length - 1];
  return Array.from({ length: slideCount }, (_, i) => `/output/${dirName}/${i + 1}.png`);
}

// ---------------------------------------------------------------------------
// Subcomponent: SlideGrid
// ---------------------------------------------------------------------------

interface SlideGridProps {
  urls: string[];
  onSlideClick: (index: number) => void;
}

function SlideGrid({ urls, onSlideClick }: SlideGridProps) {
  return (
    <div className={styles.grid}>
      {urls.map((url, i) => (
        <button
          key={url}
          className={styles.gridCell}
          onClick={() => onSlideClick(i)}
          aria-label={`View slide ${i + 1}`}
          type="button"
        >
          <img src={url} alt={`Slide ${i + 1}`} className={styles.gridImg} loading="lazy" />
          <span className={styles.gridCaption}>Slide {i + 1}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponent: Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ urls, initialIndex, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);

  function prev() {
    setIdx((i) => (i > 0 ? i - 1 : urls.length - 1));
  }
  function next() {
    setIdx((i) => (i < urls.length - 1 ? i + 1 : 0));
  }

  return (
    <Modal open onClose={onClose} width="90vw">
      <div className={styles.lightbox}>
        <button
          className={styles.lightboxNav}
          onClick={prev}
          aria-label="Previous slide"
          type="button"
        >
          ‹
        </button>
        <div className={styles.lightboxMain}>
          <img
            src={urls[idx]}
            alt={`Slide ${idx + 1}`}
            className={styles.lightboxImg}
          />
          <p className={styles.lightboxLabel}>
            {idx + 1} / {urls.length}
          </p>
        </div>
        <button
          className={styles.lightboxNav}
          onClick={next}
          aria-label="Next slide"
          type="button"
        >
          ›
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Subcomponent: CaptionPanel
// ---------------------------------------------------------------------------

interface CaptionPanelProps {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;
  captionChangedAfterRender: boolean;
}

function CaptionPanel({ post, onPostUpdated, captionChangedAfterRender }: CaptionPanelProps) {
  const { addToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local editable state — initialised from payload
  const [caption, setCaption] = useState(post.payload.caption ?? '');
  const [hashtags, setHashtags] = useState<string[]>(post.payload.hashtags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [dirty, setDirty] = useState(false);

  const handleGenerateCaption = useCallback(async () => {
    setGenerating(true);
    try {
      const updated = await api<PostRow>(`/api/posts/${post.id}/caption`, { method: 'POST' });
      onPostUpdated(updated);
      setCaption(updated.payload.caption ?? '');
      setHashtags(updated.payload.hashtags ?? []);
      setDirty(false);
      addToast('Caption generated', 'success');
    } catch (err) {
      addToast(`Caption generation failed: ${(err as Error).message}`, 'error');
    } finally {
      setGenerating(false);
    }
  }, [post.id, onPostUpdated, addToast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const newPayload: PostPayload = {
        ...post.payload,
        caption: caption || undefined,
        hashtags: hashtags.length ? hashtags : undefined,
      };
      const updated = await api<PostRow>(`/api/posts/${post.id}`, {
        method: 'PUT',
        json: { payload: newPayload },
      });
      onPostUpdated(updated);
      setDirty(false);
      addToast('Caption saved', 'success');
    } catch (err) {
      addToast(`Save failed: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [post, caption, hashtags, onPostUpdated, addToast]);

  function handleCopyCaption() {
    const tagStr = hashtags.map((t) => `#${t}`).join(' ');
    const text = tagStr ? `${caption}\n\n${tagStr}` : caption;
    navigator.clipboard.writeText(text).then(
      () => addToast('Copied to clipboard', 'success'),
      () => addToast('Could not copy', 'error'),
    );
  }

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
      setDirty(true);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setHashtags((prev) => prev.filter((t) => t !== tag));
    setDirty(true);
  }

  const hasCaption = Boolean(caption);

  return (
    <div className={styles.captionPanel}>
      <h3 className={styles.panelHeading}>Caption &amp; Hashtags</h3>

      {!hasCaption && !generating && (
        <Button
          variant="secondary"
          onClick={handleGenerateCaption}
          disabled={generating}
          className={styles.generateBtn}
        >
          Generate caption
        </Button>
      )}

      {generating && (
        <div className={styles.generatingRow}>
          <Spinner size={16} color="var(--primary)" />
          <span className={styles.generatingText}>Generating caption…</span>
        </div>
      )}

      {(hasCaption || generating) && (
        <>
          <Textarea
            label="Caption"
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              setDirty(true);
            }}
            rows={4}
            placeholder="Write a caption for this post…"
          />

          <div className={styles.tagsSection}>
            <label className={styles.tagsLabel}>Hashtags</label>
            <div className={styles.tagsRow}>
              {hashtags.map((tag) => (
                <span key={tag} className={styles.tagChip}>
                  #{tag}
                  <button
                    className={styles.tagRemove}
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove #${tag}`}
                    type="button"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                className={styles.tagInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Add tag + Enter"
                aria-label="Add hashtag"
              />
            </div>
          </div>

          <div className={styles.captionActions}>
            {dirty && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
            )}
            {hasCaption && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCaption}
              >
                Copy caption
              </Button>
            )}
            {hasCaption && !generating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateCaption}
                loading={generating}
              >
                Regenerate
              </Button>
            )}
          </div>

          {captionChangedAfterRender && (
            <p className={styles.captionHint}>
              Caption changed since last render — re-render to include it in the ZIP.
            </p>
          )}

          {!captionChangedAfterRender && (
            <p className={styles.captionNote}>
              caption.txt is included in the ZIP when a caption exists.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main: ExportStep
// ---------------------------------------------------------------------------

export interface ExportStepProps {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;
  onBack: () => void;
}

function ExportStepInner({ post, onPostUpdated, onBack }: ExportStepProps) {
  const { addToast } = useToast();

  // Rendering state
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Current post (may be updated after render / caption save)
  const [currentPost, setCurrentPost] = useState<PostRow>(post);

  // Track if caption was changed after last render
  const captionAtLastRender = useRef(
    post.status === 'rendered' ? post.payload.caption : undefined,
  );
  const [captionChangedAfterRender, setCaptionChangedAfterRender] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Abort controller for SSE
  const abortRef = useRef<AbortController | null>(null);

  // Derive slide URLs when rendered
  const slideUrls =
    currentPost.status === 'rendered' && currentPost.outputDir
      ? deriveSlideUrls(currentPost.outputDir, currentPost.payload.slides.length)
      : null;

  function handlePostUpdated(updated: PostRow) {
    setCurrentPost(updated);
    onPostUpdated(updated);
    // Check if caption changed after the render we've already done
    if (updated.status === 'rendered') {
      const captionNow = updated.payload.caption;
      if (captionNow !== captionAtLastRender.current) {
        setCaptionChangedAfterRender(true);
      }
    }
  }

  async function startRender() {
    setRendering(true);
    setRenderError(null);
    setRenderProgress(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await sse(
        `/api/posts/${currentPost.id}/render`,
        {},
        {
          signal: abort.signal,
          onEvent: (eventType, data) => {
            if (eventType === 'progress') {
              const p = data as ProgressPayload;
              setRenderProgress({ done: p.done, total: p.total });
            } else if (eventType === 'done') {
              const d = data as RenderDonePayload;
              captionAtLastRender.current = d.post.payload.caption;
              setCaptionChangedAfterRender(false);
              handlePostUpdated(d.post);
              addToast('Slides rendered successfully', 'success');
            }
          },
        },
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setRenderError((err as Error).message ?? 'Render failed');
      }
    } finally {
      setRendering(false);
    }
  }

  const isRendered = currentPost.status === 'rendered';
  const progressPct =
    renderProgress && renderProgress.total > 0
      ? Math.round((renderProgress.done / renderProgress.total) * 100)
      : 0;

  return (
    <div className={styles.root}>
      {/* ---- Header ---- */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{currentPost.title}</h2>
          <p className={styles.subtitle}>
            {currentPost.payload.slides.length} slides · {currentPost.payload.theme}
          </p>
        </div>
        {isRendered && (
          <Button
            variant="secondary"
            size="sm"
            onClick={startRender}
            disabled={rendering}
            title="Re-rendering creates a new output folder"
          >
            Re-render
          </Button>
        )}
      </div>

      {/* ---- Render panel (draft state) ---- */}
      {!isRendered && !rendering && !renderError && (
        <Card className={styles.heroPanelCard}>
          <div className={styles.heroPanel}>
            <span className={styles.heroIcon} aria-hidden="true">▦</span>
            <h3 className={styles.heroHeading}>Ready to render</h3>
            <p className={styles.heroHint}>
              {currentPost.payload.slides.length} slides will be rendered as 1080×1080 PNGs.
            </p>
            <Button onClick={startRender} size="lg">
              Render slides
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Rendering in progress ---- */}
      {rendering && (
        <Card className={styles.heroPanelCard}>
          <div className={styles.renderingPanel}>
            <Spinner size={32} color="var(--primary)" />
            <div className={styles.renderingText}>
              {renderProgress
                ? `Rendering slide ${renderProgress.done} of ${renderProgress.total}…`
                : 'Starting render…'}
            </div>
            {renderProgress && renderProgress.total > 0 && (
              <div className={styles.progressWrapper}>
                <ProgressBar
                  value={progressPct}
                  label={`Rendering slide ${renderProgress.done} of ${renderProgress.total}`}
                  showPercent
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---- Render error ---- */}
      {renderError && (
        <Card className={styles.errorCard}>
          <div className={styles.errorPanel}>
            <span className={styles.errorIcon} aria-hidden="true">⚠</span>
            <div>
              <p className={styles.errorHeading}>Render failed</p>
              <p className={styles.errorMessage}>{renderError}</p>
            </div>
            <Button variant="secondary" onClick={startRender}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Main content: grid + caption side by side ---- */}
      {isRendered && slideUrls && (
        <div className={styles.mainLayout}>
          <div className={styles.gridSection}>
            <SlideGrid urls={slideUrls} onSlideClick={(i) => setLightboxIndex(i)} />
          </div>
          <div className={styles.sidePanel}>
            <CaptionPanel
              post={currentPost}
              onPostUpdated={handlePostUpdated}
              captionChangedAfterRender={captionChangedAfterRender}
            />
          </div>
        </div>
      )}

      {/* ---- Lightbox ---- */}
      {lightboxIndex !== null && slideUrls && (
        <Lightbox
          urls={slideUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ---- Footer ---- */}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <a
          href={`/api/posts/${currentPost.id}/export.zip`}
          download
          className={isRendered ? styles.downloadLink : styles.downloadLinkDisabled}
          aria-disabled={!isRendered}
          onClick={(e) => {
            if (!isRendered) e.preventDefault();
          }}
        >
          <Button variant="primary" disabled={!isRendered}>
            Download ZIP
          </Button>
        </a>
      </div>
    </div>
  );
}

// Wrap with ToastProvider so it works standalone too
export function ExportStep(props: ExportStepProps): JSX.Element {
  return (
    <ToastProvider>
      <ExportStepInner {...props} />
    </ToastProvider>
  );
}

export default ExportStep;

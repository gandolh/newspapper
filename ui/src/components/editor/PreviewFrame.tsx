/**
 * PreviewFrame — fetches preview HTML from POST /api/preview and renders it
 * in a sandboxed iframe via srcDoc. Debounced to avoid hammering the API.
 */

import { useEffect, useRef, useState } from 'react';
import Spinner from '../ui/Spinner';

export interface PreviewFrameProps {
  templateId: string;
  data: Record<string, unknown>;
  theme: string;
  index: number;
  total: number;
  /** CSS scale factor applied via transform. E.g. 0.15 for thumbnail. */
  scale?: number;
  /** Debounce in ms before fetching. Default 800ms. */
  debounce?: number;
  /** Optional className for the outer container. */
  className?: string;
}

/** Compute a stable string key for data so we only re-fetch on real changes. */
function dataKey(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(Date.now());
  }
}

export default function PreviewFrame({
  templateId,
  data,
  theme,
  index,
  total,
  scale = 1,
  debounce = 800,
  className = '',
}: PreviewFrameProps) {
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyRef = useRef<string>('');
  const currentKey = dataKey(data) + templateId + theme + index + total;

  useEffect(() => {
    if (keyRef.current === currentKey) return;
    keyRef.current = currentKey;

    // Clear pending fetch
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, data, theme, index, total }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json() as { error?: string };
            if (j.error) msg = j.error;
          } catch { /* ignore */ }
          setError(msg);
        } else {
          const html = await res.text();
          setSrcDoc(html);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Preview failed');
      } finally {
        setLoading(false);
      }
    }, debounce);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, debounce]);

  // Outer container is always 1080×1080 * scale
  const px = Math.round(1080 * scale);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: px,
    height: px,
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: scale < 0.3 ? 4 : 8,
    background: 'var(--surface-container)',
  };

  const iframeStyle: React.CSSProperties = {
    width: 1080,
    height: 1080,
    border: 'none',
    transformOrigin: 'top left',
    transform: `scale(${scale})`,
    display: 'block',
    pointerEvents: 'none',
  };

  return (
    <div className={className} style={containerStyle}>
      <iframe
        srcDoc={srcDoc}
        sandbox=""
        title={`Slide ${index} of ${total} preview`}
        style={iframeStyle}
        aria-label="Slide preview"
      />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(251,249,248,0.7)',
        }}>
          <Spinner size={scale < 0.3 ? 14 : 24} color="var(--primary)" />
        </div>
      )}
      {!loading && error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 8,
          background: 'var(--error-container)', color: 'var(--error)',
          fontSize: scale < 0.3 ? 10 : 13, textAlign: 'center',
        }}>
          {scale < 0.3 ? '!' : error}
        </div>
      )}
    </div>
  );
}

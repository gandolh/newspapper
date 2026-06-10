import { useState, useEffect, useCallback, useRef } from 'react';
import { api, sse } from '../../lib/api';
import type { Article } from '../../lib/types';
import {
  Button,
  Badge,
  Card,
  Spinner,
  EmptyState,
  Modal,
  Input,
  Textarea,
  useToast,
} from '../ui';
import styles from './ScrapeStep.module.css';

// ---------------------------------------------------------------------------
// Types for SSE events from POST /api/scrape
// ---------------------------------------------------------------------------
interface ScrapeProgressEvent {
  sourceId: string;
  sourceName?: string;
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

interface SourceStatus {
  sourceId: string;
  sourceName: string;
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// ArticleCard
// ---------------------------------------------------------------------------
function ArticleCard({
  article,
  checked,
  onToggle,
}: {
  article: Article;
  checked: boolean;
  onToggle: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card padding="sm" className={`${styles.articleCard} ${checked ? styles.articleCardChecked : ''}`}>
      <div className={styles.articleCardRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          onChange={() => onToggle(article.id)}
          aria-label={`Select: ${article.title}`}
        />
        <div className={styles.articleContent}>
          <div className={styles.articleMeta}>
            <Badge variant="muted">{article.sourceName}</Badge>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
                aria-label="Open article"
                title={article.url}
              >
                ↗
              </a>
            )}
          </div>
          <div className={styles.articleTitle}>{article.title}</div>
          {article.body && (
            <div
              className={`${styles.articleBody} ${expanded ? styles.articleBodyExpanded : ''}`}
              onClick={() => setExpanded((e) => !e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
              aria-expanded={expanded}
              title={expanded ? 'Click to collapse' : 'Click to expand'}
            >
              {article.body}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AddArticleModal
// ---------------------------------------------------------------------------
function AddArticleModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (article: Article) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const { addToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { title?: string; body?: string } = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!body.trim()) errs.body = 'Body is required';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const article = await api<Article>('/api/articles', {
        method: 'POST',
        json: { title: title.trim(), body: body.trim(), url: url.trim() || undefined, sourceName: sourceName.trim() || undefined },
      });
      onAdded(article);
      setTitle('');
      setBody('');
      setUrl('');
      setSourceName('');
      onClose();
      addToast('Article added', 'success');
    } catch (err) {
      addToast((err as Error).message ?? 'Failed to add article', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add article manually" width={520}>
      <form onSubmit={handleSubmit} className={styles.addForm}>
        <Input
          label="Title"
          placeholder="Enter article title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          autoFocus
        />
        <Textarea
          label="Body"
          placeholder="Paste article content…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          error={errors.body}
        />
        <Input
          label="URL (optional)"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          label="Source (optional)"
          placeholder="e.g. Reuters"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
        />
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add article
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ScrapeStep
// ---------------------------------------------------------------------------
export interface ScrapeStepProps {
  onNext: (selectedIds: number[]) => void;
}

export function ScrapeStep({ onNext }: ScrapeStepProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [scrapeErrors, setScrapeErrors] = useState<string[]>([]);
  const [errorsDismissed, setErrorsDismissed] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();

  // Load today's existing articles on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const existing = await api<Article[]>('/api/articles');
        setArticles(existing);
        setSelectedIds(new Set(existing.map((a) => a.id)));
      } catch {
        // no articles yet — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleScrape = useCallback(async () => {
    setScraping(true);
    setSourceStatuses([]);
    setScrapeErrors([]);
    setErrorsDismissed(false);

    abortRef.current = new AbortController();

    try {
      await sse(
        '/api/scrape',
        {},
        {
          signal: abortRef.current.signal,
          onEvent: (event, data) => {
            if (event === 'progress') {
              const e = data as ScrapeProgressEvent;
              setSourceStatuses((prev) => {
                const idx = prev.findIndex((s) => s.sourceId === e.sourceId);
                const updated: SourceStatus = {
                  sourceId: e.sourceId,
                  sourceName: e.sourceName ?? e.sourceId,
                  status: e.status,
                  count: e.count,
                  error: e.error,
                };
                if (idx === -1) return [...prev, updated];
                const next = [...prev];
                next[idx] = updated;
                return next;
              });
            } else if (event === 'done') {
              const result = data as { articles: Article[]; errors: Array<{ sourceId: string; error: string }> };
              const newArticles = result.articles ?? [];
              setArticles(newArticles);
              setSelectedIds(new Set(newArticles.map((a) => a.id)));
              const errList = (result.errors ?? []).map((e) => `${e.sourceId}: ${e.error}`);
              if (errList.length) setScrapeErrors(errList);
            }
          },
        },
      );
    } catch (err) {
      addToast((err as Error).message ?? 'Scrape failed', 'error');
    } finally {
      setScraping(false);
    }
  }, [addToast]);

  function toggleArticle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(articles.map((a) => a.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function handleArticleAdded(article: Article) {
    setArticles((prev) => [...prev, article]);
    setSelectedIds((prev) => new Set([...prev, article.id]));
  }

  function handleCompose() {
    if (selectedIds.size === 0) return;
    onNext(Array.from(selectedIds));
  }

  const selectedCount = selectedIds.size;
  const totalCount = articles.length;

  return (
    <div className={styles.root}>
      {/* Error strip */}
      {scrapeErrors.length > 0 && !errorsDismissed && (
        <div className={styles.errorStrip} role="alert">
          <div className={styles.errorStripContent}>
            <strong>Some sources failed:</strong> {scrapeErrors.join(' · ')}
          </div>
          <button className={styles.errorStripDismiss} onClick={() => setErrorsDismissed(true)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.heading}>Articles</h2>
          {!loading && articles.length > 0 && (
            <span className={styles.selectionInfo}>
              {selectedCount} of {totalCount} selected
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          {articles.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={scraping}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone} disabled={scraping}>
                None
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => setAddModalOpen(true)} disabled={scraping}>
            + Add manually
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleScrape}
            loading={scraping}
            disabled={scraping}
          >
            {scraping ? 'Fetching…' : 'Fetch today\'s news'}
          </Button>
        </div>
      </div>

      {/* Source progress panel */}
      {scraping && sourceStatuses.length > 0 && (
        <Card padding="sm" className={styles.progressPanel}>
          <div className={styles.progressTitle}>Fetching sources…</div>
          <div className={styles.sourceList}>
            {sourceStatuses.map((s) => (
              <div key={s.sourceId} className={styles.sourceRow}>
                <span className={styles.sourceName}>{s.sourceName}</span>
                {s.status === 'fetching' && <Spinner size={14} color="var(--primary)" />}
                {s.status === 'done' && (
                  <Badge variant="success">{s.count ?? 0} articles</Badge>
                )}
                {s.status === 'error' && (
                  <Badge variant="error">{s.error ?? 'error'}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Loading skeleton / empty state */}
      {loading ? (
        <div className={styles.loadingCenter}>
          <Spinner size={24} color="var(--muted)" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon="◉"
          title="No articles yet for today"
          hint="Fetch today's news from your RSS sources or add an article manually."
          action={
            <div className={styles.emptyActions}>
              <Button onClick={handleScrape} loading={scraping}>
                Fetch today's news
              </Button>
              <Button variant="secondary" onClick={() => setAddModalOpen(true)}>
                Add manually
              </Button>
            </div>
          }
        />
      ) : (
        /* Article list */
        <div className={styles.articleList}>
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              checked={selectedIds.has(article.id)}
              onToggle={toggleArticle}
            />
          ))}
        </div>
      )}

      {/* Footer action */}
      {!loading && articles.length > 0 && (
        <div className={styles.footer}>
          <Button
            onClick={handleCompose}
            disabled={selectedCount === 0 || scraping}
            size="lg"
          >
            Compose with AI →
          </Button>
          {selectedCount === 0 && (
            <span className={styles.footerHint}>Select at least one article to continue</span>
          )}
        </div>
      )}

      {/* Add article modal */}
      <AddArticleModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={handleArticleAdded}
      />
    </div>
  );
}

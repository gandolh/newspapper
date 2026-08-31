import { useState, useEffect, useCallback, useRef } from 'react';
import { api, sse, ApiError } from '@/lib/api';
import type { Article, ScrapedArticle, SourceConfig } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Select,
  Mark,
  Skeleton,
  EmptyState,
  PageHeader,
  ToastProvider,
  useToast,
  ConfirmDialog,
} from '../ui';
import SourcesPanel from './SourcesPanel';
import styles from './ArticlesIsland.module.css';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function excerpt(body: string, max = 220): string {
  if (body.length <= max) return body;
  return body.slice(0, max).trimEnd() + '…';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// SearchPanel — keyword search over the enabled sources. Nothing here is
// persisted until the user explicitly saves a result.
// ---------------------------------------------------------------------------

interface SourceProgress {
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

function SearchPanel() {
  const { addToast } = useToast();
  const [keywordsInput, setKeywordsInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState<Record<string, SourceProgress>>({});
  const [results, setResults] = useState<ScrapedArticle[]>([]);
  const [savedGuids, setSavedGuids] = useState<Set<string>>(new Set());
  const [savingGuid, setSavingGuid] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      addToast('Enter at least one keyword', 'error');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setHasSearched(true);
    setProgress({});
    setResults([]);
    setSavedGuids(new Set());

    try {
      await sse(
        '/api/scrape',
        { keywords },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            if (event === 'progress') {
              const p = data as {
                sourceId: string;
                status: SourceProgress['status'];
                count?: number;
                error?: string;
              };
              setProgress((prev) => ({
                ...prev,
                [p.sourceId]: {
                  status: p.status,
                  count: p.count,
                  error: p.error,
                },
              }));
            } else if (event === 'done') {
              const d = data as { articles: ScrapedArticle[] };
              setResults(d.articles);
            }
          },
        },
      );
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleSave(article: ScrapedArticle) {
    setSavingGuid(article.guid);
    try {
      await api<Article>('/api/articles', {
        method: 'POST',
        json: {
          sourceId: article.sourceId,
          sourceName: article.sourceName,
          guid: article.guid,
          title: article.title,
          url: article.url,
          body: article.body,
          publishedAt: article.publishedAt,
        },
      });
      setSavedGuids((prev) => new Set(prev).add(article.guid));
      addToast('Saved to library', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSavingGuid(null);
    }
  }

  const progressRows = Object.entries(progress);

  return (
    <div>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          placeholder="budget, economy, tax"
          hint="Comma-separated keywords. An article matching any one of them counts."
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          disabled={searching}
        />
        <Button type="submit" loading={searching}>
          Search
        </Button>
      </form>

      {progressRows.length > 0 && (
        <div className={styles.progressList}>
          {progressRows.map(([sourceId, p]) => (
            <span key={sourceId} className={styles.progressItem}>
              <Mark tone={p.status === 'error' ? 'rubylith' : p.status === 'done' ? 'ink' : 'dim'}>
                {sourceId}
                {p.status === 'fetching' && ' …'}
                {p.status === 'done' && ` · ${p.count ?? 0} match${p.count === 1 ? '' : 'es'}`}
                {p.status === 'error' && ' · failed'}
              </Mark>
            </span>
          ))}
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <EmptyState
          icon="⌕"
          title="No matches"
          hint="Try broader or different keywords, or check that your sources are enabled."
        />
      )}

      <div className={styles.resultList}>
        {results.map((article) => {
          const saved = savedGuids.has(article.guid);
          return (
            <Card
              key={`${article.sourceId}:${article.guid}`}
              padding="sm"
              className={styles.resultCard}
            >
              <div className={styles.resultMeta}>
                <Mark>{article.sourceName}</Mark>
                <span className={styles.metaText}>{formatDate(article.publishedAt)}</span>
                <span className={styles.metaText}>
                  {article.matchCount} match
                  {article.matchCount === 1 ? '' : 'es'}
                </span>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.externalLink}
                  >
                    ↗
                  </a>
                )}
              </div>
              <div className={styles.resultTitle}>{article.title}</div>
              {article.body && <p className={styles.resultExcerpt}>{excerpt(article.body)}</p>}
              <div className={styles.resultActions}>
                <Button
                  size="sm"
                  variant={saved ? 'secondary' : 'primary'}
                  disabled={saved}
                  loading={savingGuid === article.guid}
                  onClick={() => handleSave(article)}
                >
                  {saved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LibraryPanel — saved articles: filter by source, search title + body, delete
// ---------------------------------------------------------------------------

function LibraryPanel() {
  const { addToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter) params.set('sourceId', sourceFilter);
      if (search.trim()) params.set('search', search.trim());
      const data = await api<Article[]>(`/api/articles?${params.toString()}`);
      setArticles(data);
    } catch {
      addToast('Failed to load the library', 'error');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, search, addToast]);

  useEffect(() => {
    api<SourceConfig[]>('/api/sources')
      .then(setSources)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // Kept as an effect: a fetch keyed on the query, not derivable state.
    // `load` opens with `setLoading(true)` and that is deliberate — a refilter
    // has to swap the rows for the skeleton, otherwise the table sits showing
    // results for a filter the user has already changed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api(`/api/articles/${deleteTarget.id}`, { method: 'DELETE' });
      setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      addToast('Deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  const sourceOptions = [
    { value: '', label: 'All sources' },
    ...sources.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div>
      <div className={styles.filterBar}>
        <Input
          placeholder="Search saved articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select options={sourceOptions} value={sourceFilter} onValueChange={setSourceFilter} />
      </div>

      {loading ? (
        <div className={styles.loadingList}>
          <Skeleton height={78} />
          <Skeleton height={78} />
          <Skeleton height={78} />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon="—"
          title="Nothing saved yet"
          hint="Search for a keyword and save an article to start building your library."
        />
      ) : (
        <div className={styles.resultList}>
          {articles.map((article) => (
            <Card key={article.id} padding="sm" className={styles.resultCard}>
              <div className={styles.resultMeta}>
                <Mark>{article.sourceName || 'Manual'}</Mark>
                <span className={styles.metaText}>{formatDate(article.publishedAt)}</span>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.externalLink}
                  >
                    ↗
                  </a>
                )}
              </div>
              <div className={styles.resultTitle}>{article.title}</div>
              {article.body && <p className={styles.resultExcerpt}>{excerpt(article.body)}</p>}
              <div className={styles.resultActions}>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(article)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete article?"
        message={`Remove "${deleteTarget?.title}" from the library? This can't be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={deleteLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArticlesPage — tab switcher (needs the toast context)
// ---------------------------------------------------------------------------

type Tab = 'search' | 'library' | 'sources';

function ArticlesPage() {
  const [tab, setTab] = useState<Tab>('search');

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'search', label: 'Search' },
    { id: 'library', label: 'Library' },
    { id: 'sources', label: 'Sources' },
  ];

  return (
    <div>
      <PageHeader
        title="Articles"
        subtitle="Search RSS feeds by keyword, save what's worth writing about, and manage your sources."
      />

      <div className={styles.tabBar} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {tab === 'search' && <SearchPanel />}
        {tab === 'library' && <LibraryPanel />}
        {tab === 'sources' && <SourcesPanel />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export (wrapped in ToastProvider)
// ---------------------------------------------------------------------------

export default function ArticlesIsland() {
  return (
    <ToastProvider>
      <ArticlesPage />
    </ToastProvider>
  );
}

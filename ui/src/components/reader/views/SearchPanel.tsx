/**
 * The Reader's Search view — keyword search over the enabled sources.
 *
 * Moved out of the old `/articles` sheet (`ArticlesIsland`) by brief 105, not
 * rewritten: it still fetches every enabled feed and each matching item's page
 * live, per query, and nothing here is persisted until a result is saved. The
 * Reader's stored items are a different thing; repointing Search at them is
 * its own decision (brief 105, "Not in this brief").
 *
 * It renders inside `ReaderIsland`'s `ToastProvider` and carries none of its
 * own.
 */
import { useState, useRef } from 'react';
import { api, sse, ApiError } from '@/lib/api';
import type { Article, ScrapedArticle } from '@/lib/types';
import { Button, Card, Input, Mark, EmptyState, PageHeader, useToast } from '../../ui';
import { excerpt, formatDate } from '../format';
import styles from './Clippings.module.css';

interface SourceProgress {
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

export default function SearchPanel() {
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
    <div className={styles.panel}>
      <PageHeader
        title="Search"
        subtitle="Search every enabled feed by keyword, live. Nothing is kept unless you save it."
      />

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          placeholder="budget, economy, tax"
          hint="Comma-separated keywords. An article matching any one of them counts."
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          disabled={searching}
          aria-label="Keywords"
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
                    aria-label="Open the original"
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

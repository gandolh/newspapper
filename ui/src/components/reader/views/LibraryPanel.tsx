/**
 * The Reader's Library view — saved articles: filter by source, search title
 * + body, edit the note, delete.
 *
 * Moved out of the old `/articles` sheet (`ArticlesIsland`) by brief 105. What
 * it gained there is the note: a saved article is a reference you write from
 * (decisions.md), and the note is why you kept it. It shows on the card and is
 * edited in place with `PATCH /api/articles/:id`.
 *
 * It renders inside `ReaderIsland`'s `ToastProvider` and carries none of its
 * own.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Article, ArticleSummary, Source } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Select,
  Mark,
  Skeleton,
  EmptyState,
  PageHeader,
  Textarea,
  useToast,
  ConfirmDialog,
} from '../../ui';
import { excerpt, formatDate } from '../format';
import styles from './Clippings.module.css';

export default function LibraryPanel() {
  const { addToast } = useToast();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ArticleSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter) params.set('sourceId', sourceFilter);
      if (search.trim()) params.set('search', search.trim());
      const data = await api<ArticleSummary[]>(`/api/articles?${params.toString()}`);
      setArticles(data);
    } catch {
      addToast('Failed to load the library', 'error');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, search, addToast]);

  useEffect(() => {
    api<Source[]>('/api/sources')
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

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingNote(true);
    try {
      const updated = await api<Article>(`/api/articles/${editing.id}`, {
        method: 'PATCH',
        json: { note: editing.text.trim() },
      });
      setArticles((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, note: updated.note } : a)),
      );
      setEditing(null);
      addToast(updated.note ? 'Note saved' : 'Note cleared', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSavingNote(false);
    }
  }

  const sourceOptions = [
    { value: '', label: 'All sources' },
    ...sources.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className={styles.panel}>
      <PageHeader title="Library" subtitle="What you saved to write from, and why you kept it." />

      <div className={styles.filterBar}>
        <Input
          placeholder="Search saved articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search saved articles"
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
          hint="Save an item from the Reader, or a Search result, to start building your library."
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
                    aria-label="Open the original"
                  >
                    ↗
                  </a>
                )}
              </div>
              <div className={styles.resultTitle}>{article.title}</div>
              {article.excerpt && (
                <p className={styles.resultExcerpt}>{excerpt(article.excerpt)}</p>
              )}

              {editing?.id === article.id ? (
                <form className={styles.noteForm} onSubmit={handleSaveNote}>
                  <Textarea
                    id={`note-${article.id}`}
                    label="Note"
                    placeholder="Why this is worth writing from"
                    hint="Ctrl+Enter saves · Esc cancels. An empty note clears it."
                    value={editing.text}
                    autoFocus
                    rows={2}
                    onChange={(e) => setEditing({ id: article.id, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditing(null);
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <div className={styles.resultActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                      disabled={savingNote}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" loading={savingNote}>
                      Save note
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  {article.note && (
                    <p className={styles.note}>
                      <span className={styles.noteLabel}>Note</span>
                      {article.note}
                    </p>
                  )}
                  <div className={styles.resultActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ id: article.id, text: article.note })}
                    >
                      {article.note ? 'Edit note' : 'Add note'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(article)}>
                      Delete
                    </Button>
                  </div>
                </>
              )}
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

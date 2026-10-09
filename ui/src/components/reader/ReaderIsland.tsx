/**
 * The Reader — `/reader` (brief 105). It replaced `/articles`, which now
 * redirects here.
 *
 * Three panes on the board's full width: the rail (what to read), the list
 * (the items) and the reading pane (one item). The old sheet's Search,
 * Library and Sources panels are the Reader's other views, reached from the
 * rail; they were moved here, not rewritten.
 *
 * Below 1100px the panes stack and show one at a time — rail → list →
 * article — each with a way back. Which one shows is `stage`, read only by
 * CSS: on a wide board every pane is on screen and `stage` changes nothing.
 *
 * What is selected (scope, source, category, filter, open item) lives here in
 * component state, not in the URL: `router.tsx` knows only the pathname.
 *
 * Loading is modelled as "no result yet for the current selection" rather
 * than as a flag an effect switches on — a list whose key is not the current
 * one is loading. The effects only ever set state when a request settles.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, sse } from '@/lib/api';
import type {
  ArticleSummary,
  Article,
  FeedItem,
  FeedItemPage,
  FeedItemSummary,
  ReaderCounts,
  Source,
} from '@/lib/types';
import { Button, ConfirmDialog, EmptyState, ToastProvider, useToast } from '../ui';
import BackControl from './BackControl';
import ItemList from './ItemList';
import KeyLegend from './KeyLegend';
import Rail, { type ReaderView, type RefreshState, type SourceProgress } from './Rail';
import ReadingPane, { type NoteDraft } from './ReadingPane';
import { attributedQuote, titleAndLink } from './format';
import { useReaderKeys, type ReaderKeyAction } from './keys';
import { markAllRead } from './markAllRead';
import { adjustUnread, itemsPath, unreadIn, type Narrow, type ReaderScope } from './query';
import LibraryPanel from './views/LibraryPanel';
import SearchPanel from './views/SearchPanel';
import SourcesPanel from './views/SourcesPanel';
import styles from './ReaderIsland.module.css';

/** Which pane shows below the narrow breakpoint. */
type Stage = 'rail' | 'list' | 'article';

interface ListState {
  key: string;
  scope: ReaderScope;
  narrow: Narrow;
  q: string;
  items: FeedItemSummary[];
  nextCursor: string | null;
  error: string | null;
  /** The clock row ages are measured against. */
  loadedAt: number;
}

const FILTER_ID = 'reader-filter';
const FILTER_DEBOUNCE_MS = 300;
/** Mirrors the 1099px media query in ReaderIsland.module.css. */
const NARROW_QUERY = '(max-width: 1099px)';

function selectionKey(scope: ReaderScope, narrow: Narrow, q: string): string {
  return JSON.stringify([scope, narrow, q]);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function atNarrow(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches;
}

function ReaderPage() {
  const { addToast } = useToast();

  const [view, setView] = useState<ReaderView>('read');
  const [stage, setStage] = useState<Stage>('list');
  const [scope, setScope] = useState<ReaderScope>('unread');
  const [narrow, setNarrow] = useState<Narrow>(null);
  const [filterInput, setFilterInput] = useState('');
  const [q, setQ] = useState('');

  const [listEpoch, setListEpoch] = useState(0);
  const [list, setList] = useState<ListState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [railEpoch, setRailEpoch] = useState(0);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [counts, setCounts] = useState<ReaderCounts | null>(null);
  const [railFailed, setRailFailed] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<FeedItem | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [note, setNote] = useState<NoteDraft | null>(null);

  const [refresh, setRefresh] = useState<RefreshState | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);
  const [marking, setMarking] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  /** Bumped on every open, so a slow response for an item the reader has
   * already moved past is dropped. */
  const openSeq = useRef(0);
  const refreshAbort = useRef<AbortController | null>(null);

  // ---- data ---------------------------------------------------------------

  // The filter box applies after a pause in typing, not on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setQ(filterInput.trim()), FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [filterInput]);

  const key = selectionKey(scope, narrow, q);

  useEffect(() => {
    let live = true;
    const settle = (page: FeedItemPage | null, error: string | null) => {
      if (!live) return;
      setList({
        key: selectionKey(scope, narrow, q),
        scope,
        narrow,
        q,
        items: page?.items ?? [],
        nextCursor: page?.nextCursor ?? null,
        error,
        loadedAt: Date.now(),
      });
    };
    api<FeedItemPage>(itemsPath({ scope, narrow, q })).then(
      (page) => settle(page, null),
      (err: unknown) => settle(null, messageOf(err)),
    );
    return () => {
      live = false;
    };
  }, [scope, narrow, q, listEpoch]);

  useEffect(() => {
    let live = true;
    Promise.all([api<Source[]>('/api/sources'), api<ReaderCounts>('/api/reader/counts')]).then(
      ([nextSources, nextCounts]) => {
        if (!live) return;
        setSources(nextSources);
        setCounts(nextCounts);
        setRailFailed(false);
      },
      () => {
        if (live) setRailFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [railEpoch]);

  // A refresh still streaming when the page goes away is abandoned, not left
  // reading into an unmounted tree.
  useEffect(() => {
    const aborts = refreshAbort;
    return () => aborts.current?.abort();
  }, []);

  const listLoading = list === null || list.key !== key;
  const rows = list && !listLoading ? list.items : [];
  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;
  const shown = item ?? selectedRow;

  // ---- selection ----------------------------------------------------------

  function select(nextScope: ReaderScope | null, nextNarrow: Narrow) {
    if (view !== 'read') setRailEpoch((e) => e + 1);
    setView('read');
    if (nextScope) setScope(nextScope);
    setNarrow(nextNarrow);
    setListEpoch((e) => e + 1);
    setStage('list');
    if (atNarrow()) window.scrollTo({ top: 0 });
  }

  function selectView(next: ReaderView) {
    setView(next);
    setStage('list');
    if (atNarrow()) window.scrollTo({ top: 0 });
  }

  function patchRow(id: number, patch: Partial<FeedItemSummary>) {
    setList(
      (l) => l && { ...l, items: l.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
    );
  }

  async function setRead(target: Pick<FeedItemSummary, 'id' | 'sourceId' | 'read'>, read: boolean) {
    if (target.read === read) return;
    await api(`/api/reader/items/${target.id}`, { method: 'PATCH', json: { read } });
    const readAt = new Date().toISOString();
    patchRow(target.id, { read });
    setItem((it) =>
      it && it.id === target.id ? { ...it, read, readAt: read ? (it.readAt ?? readAt) : null } : it,
    );
    setCounts((c) => c && adjustUnread(c, target.sourceId, read ? -1 : 1));
  }

  /**
   * Open an item. Opening is what marks it read — a separate write, because
   * the GET has no side effect — and it is sent the moment the item is
   * opened, alongside the GET rather than after it. Walking down the list with
   * j marks every item it lands on, however fast.
   */
  async function openItem(id: number) {
    const seq = ++openSeq.current;
    const row = rows.find((r) => r.id === id) ?? null;
    setSelectedId(id);
    setItem(null);
    setItemError(null);
    setNote(null);
    setStage('article');
    if (atNarrow()) window.scrollTo({ top: 0 });

    const marked: Promise<boolean> =
      row && !row.read
        ? setRead(row, true).then(
            () => true,
            (err: unknown) => {
              addToast(messageOf(err), 'error');
              return false;
            },
          )
        : Promise.resolve(false);

    try {
      const full = await api<FeedItem>(`/api/reader/items/${id}`);
      // The GET may have been answered before the PATCH landed.
      const read = (await marked) || full.read;
      if (seq !== openSeq.current) return;
      setItem({ ...full, read, readAt: read ? (full.readAt ?? new Date().toISOString()) : null });
      // Opened from somewhere other than the loaded list: mark it now.
      if (!row && !full.read) await setRead(full, true);
    } catch (err) {
      if (seq === openSeq.current) setItemError(messageOf(err));
    }
  }

  function step(delta: 1 | -1) {
    if (rows.length === 0) return;
    const index = rows.findIndex((r) => r.id === selectedId);
    if (index === -1) {
      void openItem(rows[0]!.id);
      return;
    }
    const next = index + delta;
    if (next < 0) return;
    if (next >= rows.length) {
      if (list?.nextCursor && !loadingMore) void loadMore();
      return;
    }
    void openItem(rows[next]!.id);
  }

  async function loadMore() {
    if (!list?.nextCursor || loadingMore) return;
    const from = list;
    setLoadingMore(true);
    try {
      const page = await api<FeedItemPage>(
        itemsPath({ scope: from.scope, narrow: from.narrow, q: from.q, cursor: from.nextCursor }),
      );
      setList((l) =>
        l && l.key === from.key
          ? { ...l, items: [...l.items, ...page.items], nextCursor: page.nextCursor }
          : l,
      );
    } catch (err) {
      addToast(messageOf(err), 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleRead() {
    if (!shown) return;
    try {
      await setRead(shown, !shown.read);
    } catch (err) {
      addToast(messageOf(err), 'error');
    }
  }

  // ---- keeping it ---------------------------------------------------------

  /** Save to library opens the note field; on a saved item it edits the note,
   * which is fetched first so the field starts from what is there. */
  async function startSave() {
    if (!item) return;
    if (!item.saved || item.articleId === null) {
      setNote({ mode: 'save', text: '', loading: false, busy: false });
      return;
    }
    const target = item;
    const seq = openSeq.current;
    setNote({ mode: 'edit', text: '', loading: true, busy: false });
    try {
      const library = await api<ArticleSummary[]>(
        `/api/articles?sourceId=${encodeURIComponent(target.sourceId)}`,
      );
      if (seq !== openSeq.current) return;
      const article = library.find((a) => a.id === target.articleId);
      if (!article) {
        // Deleted from the library since the item loaded: saving is the way back.
        setItem((it) =>
          it && it.id === target.id ? { ...it, saved: false, articleId: null } : it,
        );
        patchRow(target.id, { saved: false });
        setNote({ mode: 'save', text: '', loading: false, busy: false });
        return;
      }
      setNote({ mode: 'edit', text: article.note, loading: false, busy: false });
    } catch (err) {
      setNote(null);
      addToast(messageOf(err), 'error');
    }
  }

  async function submitNote() {
    if (!note || !item || note.busy || note.loading) return;
    const target = item;
    const text = note.text.trim();
    setNote({ ...note, busy: true });
    try {
      if (note.mode === 'save' || target.articleId === null) {
        const article = await api<Article>(`/api/reader/items/${target.id}/save`, {
          method: 'POST',
          json: text ? { note: text } : {},
        });
        // Saving an item that is already saved returns it unchanged, note
        // included; a note typed now still has to land.
        if (text && article.note !== text) {
          await api<Article>(`/api/articles/${article.id}`, {
            method: 'PATCH',
            json: { note: text },
          });
        }
        setItem((it) =>
          it && it.id === target.id ? { ...it, saved: true, articleId: article.id } : it,
        );
        patchRow(target.id, { saved: true });
        addToast(text ? 'Saved to library, with the note' : 'Saved to library', 'success');
      } else {
        await api<Article>(`/api/articles/${target.articleId}`, {
          method: 'PATCH',
          json: { note: text },
        });
        addToast(text ? 'Note saved' : 'Note cleared', 'success');
      }
      setNote(null);
    } catch (err) {
      setNote((n) => n && { ...n, busy: false });
      addToast(messageOf(err), 'error');
    }
  }

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      addToast(done, 'success');
    } catch {
      addToast('The browser refused clipboard access', 'error');
    }
  }

  function copyLink() {
    if (shown) void copy(titleAndLink(shown.title, shown.url), 'Copied the title and link');
  }

  function copyQuote(passage: string) {
    if (shown && passage) void copy(attributedQuote(passage, shown), 'Copied the quote');
  }

  // ---- refresh ------------------------------------------------------------

  async function runRefresh() {
    if (refresh || refreshAbort.current) return;
    const controller = new AbortController();
    refreshAbort.current = controller;
    setRefresh({ progress: {}, total: sources?.filter((s) => s.enabled).length ?? 0 });

    const outcome: {
      done: { newCount: number; errors: Array<{ sourceId: string; error: string }> } | null;
      failure: string | null;
    } = { done: null, failure: null };

    try {
      await sse(
        '/api/reader/refresh',
        {},
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            if (event === 'progress') {
              const p = data as SourceProgress & { sourceId: string };
              setRefresh(
                (r) =>
                  r && {
                    ...r,
                    progress: {
                      ...r.progress,
                      [p.sourceId]: { status: p.status, count: p.count, error: p.error },
                    },
                  },
              );
            } else if (event === 'done') {
              outcome.done = data as NonNullable<typeof outcome.done>;
            } else if (event === 'error') {
              outcome.failure = (data as { message?: string } | null)?.message ?? 'Refresh failed';
            }
          },
        },
      );
    } catch (err) {
      outcome.failure ??= messageOf(err);
    } finally {
      refreshAbort.current = null;
    }
    if (controller.signal.aborted) return;

    setRefresh(null);
    setRailEpoch((e) => e + 1);
    setListEpoch((e) => e + 1);
    if (outcome.failure) {
      addToast(outcome.failure, 'error');
    } else if (outcome.done) {
      const { newCount, errors } = outcome.done;
      addToast(
        errors.length
          ? `${plural(newCount, 'new item')} · ${plural(errors.length, 'feed')} failed`
          : `${plural(newCount, 'new item')}`,
        errors.length ? 'error' : 'success',
      );
    }
  }

  // ---- mark all read ------------------------------------------------------

  const filterActive = !!list?.q;
  const unreadHere = counts && sources ? unreadIn(counts, narrow, sources) : 0;
  const canMarkAllRead =
    !listLoading &&
    rows.length > 0 &&
    (filterActive ? rows.some((r) => !r.read) : unreadHere > 0 || rows.some((r) => !r.read));

  async function confirmMarkAllRead() {
    if (!list || listLoading) return;
    const from = list;
    setMarking(true);
    try {
      const result = await markAllRead(from.items, from.q, from.narrow, (path, init) =>
        api(path, init),
      );
      setList((l) =>
        l && l.key === from.key
          ? { ...l, items: l.items.map((r) => (result.isNowRead(r) ? { ...r, read: true } : r)) }
          : l,
      );
      setItem((it) => (it && result.isNowRead(it) ? { ...it, read: true } : it));
      setConfirmMarkAll(false);
      addToast(`Marked ${plural(result.marked, 'item')} read`, 'success');
    } catch (err) {
      addToast(messageOf(err), 'error');
      setListEpoch((e) => e + 1);
    } finally {
      setMarking(false);
      setRailEpoch((e) => e + 1);
    }
  }

  // ---- keys ---------------------------------------------------------------

  function focusFilter() {
    setStage('list');
    window.requestAnimationFrame(() => document.getElementById(FILTER_ID)?.focus());
  }

  function onKey(action: ReaderKeyAction, event: KeyboardEvent) {
    event.preventDefault();
    switch (action) {
      case 'next':
        return step(1);
      case 'previous':
        return step(-1);
      case 'toggleRead':
        return void toggleRead();
      case 'save':
        return void startSave();
      case 'openOriginal':
        if (shown) window.open(shown.url, '_blank', 'noopener,noreferrer');
        return;
      case 'copyLink':
        return copyLink();
      case 'refresh':
        return void runRefresh();
      case 'focusFilter':
        return focusFilter();
      case 'markAllRead':
        if (canMarkAllRead) setConfirmMarkAll(true);
        return;
      case 'legend':
        setLegendOpen(true);
        return;
    }
  }

  useReaderKeys(view === 'read' && !legendOpen && !confirmMarkAll, onKey);

  // ---- render -------------------------------------------------------------

  const narrowedSource =
    narrow?.kind === 'source' ? (sources?.find((s) => s.id === narrow.sourceId) ?? null) : null;
  const heading =
    narrow === null
      ? scope === 'unread'
        ? 'Unread'
        : 'All items'
      : narrow.kind === 'source'
        ? (narrowedSource?.name ?? narrow.sourceId)
        : (narrow.category ?? 'Uncategorized');

  function emptyList(): ReactNode {
    if (list?.q) {
      return (
        <EmptyState
          icon="⌕"
          title="Nothing matches"
          hint={`No ${scope === 'unread' ? 'unread ' : ''}item in ${heading} has “${list.q}” in its title or text. Comma-separated terms: any one matches.`}
        />
      );
    }
    if (scope === 'unread') {
      return (
        <EmptyState
          icon="✓"
          title="All caught up"
          hint={`Nothing unread in ${heading}.`}
          action={
            <Button size="sm" variant="secondary" onClick={() => select('all', narrow)}>
              Show all
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon="↻"
        title="Nothing fetched yet"
        hint="Refresh fetches every enabled feed now. The server also refreshes on its own."
        action={
          <Button size="sm" loading={refresh !== null} onClick={() => void runRefresh()}>
            Refresh
          </Button>
        }
      />
    );
  }

  const noSources = sources !== null && sources.length === 0;
  const viewLabel = { read: 'Reader', search: 'Search', library: 'Library', sources: 'Sources' }[
    view
  ];

  return (
    <div className={styles.reader} data-stage={stage}>
      <aside className={styles.rail}>
        <Rail
          view={view}
          scope={scope}
          narrow={narrow}
          sources={sources}
          counts={counts}
          failed={railFailed}
          refresh={refresh}
          onRefresh={() => void runRefresh()}
          onRetry={() => setRailEpoch((e) => e + 1)}
          onSelect={select}
          onView={selectView}
          onLegend={() => setLegendOpen(true)}
        />
      </aside>

      {view !== 'read' ? (
        <section className={styles.view} aria-label={viewLabel}>
          <BackControl label="Feeds" onClick={() => setStage('rail')} />
          {view === 'search' && <SearchPanel />}
          {view === 'library' && <LibraryPanel />}
          {view === 'sources' && <SourcesPanel />}
        </section>
      ) : noSources ? (
        <section className={styles.view} aria-label="No feeds">
          <BackControl label="Feeds" onClick={() => setStage('rail')} />
          <EmptyState
            icon="⊕"
            title="No feeds yet"
            hint="The Reader stores what your RSS feeds publish. Add one under Sources, then Refresh."
            action={<Button onClick={() => selectView('sources')}>Add a source</Button>}
          />
        </section>
      ) : (
        <>
          <section className={styles.list} aria-label="Items">
            <ItemList
              heading={heading}
              scope={scope}
              onScopeChange={(s) => select(s, narrow)}
              filterId={FILTER_ID}
              filterInput={filterInput}
              onFilterChange={setFilterInput}
              rows={rows}
              loading={listLoading}
              error={list && !listLoading ? list.error : null}
              onRetry={() => setListEpoch((e) => e + 1)}
              nextCursor={list && !listLoading ? list.nextCursor : null}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              selectedId={selectedId}
              onOpen={(id) => void openItem(id)}
              now={list?.loadedAt ?? 0}
              canMarkAllRead={canMarkAllRead}
              onMarkAllRead={() => setConfirmMarkAll(true)}
              failing={narrowedSource?.lastError ? narrowedSource : null}
              empty={emptyList()}
              onBack={() => setStage('rail')}
            />
          </section>
          <section className={styles.pane} aria-label="Reading pane">
            <ReadingPane
              summary={shown}
              item={item}
              error={itemError}
              note={note}
              onSave={() => void startSave()}
              onNoteChange={(text) => setNote((n) => n && { ...n, text })}
              onNoteSubmit={() => void submitNote()}
              onNoteCancel={() => setNote(null)}
              onToggleRead={() => void toggleRead()}
              onCopyLink={copyLink}
              onCopyQuote={copyQuote}
              onRetry={() => selectedId !== null && void openItem(selectedId)}
              onBack={() => setStage('list')}
            />
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirmMarkAll}
        onClose={() => setConfirmMarkAll(false)}
        onConfirm={() => void confirmMarkAllRead()}
        title="Mark all read?"
        message={
          filterActive
            ? `Mark the ${plural(rows.filter((r) => !r.read).length, 'loaded item')} matching “${list?.q}” as read? Items the filter hid stay as they are.`
            : `Mark everything unread in ${heading}, up to the newest item loaded, as read? Items that arrive after this list loaded stay unread.`
        }
        confirmLabel="Mark read"
        cancelLabel="Keep them"
        variant="primary"
        loading={marking}
      />

      <KeyLegend open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}

export default function ReaderIsland() {
  return (
    <ToastProvider>
      <ReaderPage />
    </ToastProvider>
  );
}

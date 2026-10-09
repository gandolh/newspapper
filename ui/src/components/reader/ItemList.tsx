/**
 * The Reader's list: a filter, Mark all read, the rows, and Load more.
 *
 * A row says unread twice, and never by colour: the title is set heavy, and a
 * solid square sits in the margin (both go when it is read). The source, the
 * age and a Saved mark run under the title. The open row is pulled forward
 * the way every selection on the board is — paper and the waxed shadow.
 *
 * "Load more" is a button at the end, not infinite scroll: what the list has
 * loaded is what Mark all read is bounded by, so loading has to be a thing you
 * did.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import type { FeedItemSummary, Source } from '@/lib/types';
import { Button, ChipRow, Finding, Input, Mark, Skeleton } from '../ui';
import BackControl from './BackControl';
import { formatAge } from './format';
import type { ReaderScope } from './query';
import styles from './ItemList.module.css';

export interface ItemListProps {
  heading: string;
  scope: ReaderScope;
  onScopeChange: (scope: ReaderScope) => void;
  filterId: string;
  filterInput: string;
  onFilterChange: (value: string) => void;
  rows: FeedItemSummary[];
  /** No result yet for the current selection: show the skeleton. */
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  selectedId: number | null;
  onOpen: (id: number) => void;
  /** The clock the ages are measured against, taken when the page loaded. */
  now: number;
  canMarkAllRead: boolean;
  onMarkAllRead: () => void;
  /** The narrowed source, when its last refresh failed. */
  failing: Source | null;
  /** What an empty list says for this selection. */
  empty: ReactNode;
  onBack: () => void;
}

const SCOPES = [
  { value: 'unread', label: 'Unread' },
  { value: 'all', label: 'All' },
];

export default function ItemList(props: ItemListProps) {
  const { rows, selectedId } = props;
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the open row in view as j and k walk the list.
  useEffect(() => {
    if (selectedId === null) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  return (
    <div className={styles.list}>
      <BackControl label="Feeds" onClick={props.onBack} />

      <header className={styles.head}>
        <h2 className={styles.heading}>{props.heading}</h2>
        <ChipRow
          options={SCOPES}
          value={props.scope}
          onValueChange={(v) => props.onScopeChange(v as ReaderScope)}
          ariaLabel="Show"
          pad="hair"
        />
      </header>

      <div className={styles.tools}>
        <Input
          id={props.filterId}
          // Not type="search": Chrome clears a search field on Esc, and Esc
          // here means "give the keys back", not "drop the filter".
          type="text"
          role="searchbox"
          placeholder="Filter: budget, tax"
          aria-label="Filter items (comma-separated terms, any one matches)"
          value={props.filterInput}
          onChange={(e) => props.onFilterChange(e.target.value)}
          onKeyDown={(e) => {
            // Esc hands the keys back to the Reader, filter kept.
            if (e.key === 'Escape') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={props.onMarkAllRead}
          disabled={!props.canMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      {props.failing?.lastError && (
        <Finding where={`${props.failing.name} · last refresh`}>{props.failing.lastError}</Finding>
      )}

      {props.loading ? (
        <div className={styles.skeletons} role="status">
          <span className={styles.srOnly}>Loading items</span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      ) : props.error ? (
        <div className={styles.error}>
          <Mark tone="rubylith">The list did not load</Mark>
          <p className={styles.errorText}>{props.error}</p>
          <Button size="sm" variant="secondary" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        props.empty
      ) : (
        <>
          <ul className={styles.rows} ref={listRef}>
            {rows.map((row) => {
              const selected = row.id === selectedId;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-item-id={row.id}
                    className={[
                      styles.row,
                      row.read ? styles.read : styles.unread,
                      selected ? styles.selected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => props.onOpen(row.id)}
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.rowBody}>
                      <span className={styles.srOnly}>{row.read ? 'Read: ' : 'Unread: '}</span>
                      <span className={styles.title}>{row.title || 'Untitled'}</span>
                      <span className={styles.meta}>
                        <span className={styles.source}>{row.sourceName}</span>
                        <span>{formatAge(row.sortAt, props.now)}</span>
                        {row.saved && (
                          <Mark tone="ink" className={styles.saved}>
                            Saved
                          </Mark>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.more}>
            {props.nextCursor ? (
              <Button
                size="sm"
                variant="secondary"
                loading={props.loadingMore}
                onClick={props.onLoadMore}
              >
                Load more
              </Button>
            ) : (
              <Mark>End of the list · {rows.length} loaded</Mark>
            )}
          </div>
        </>
      )}
    </div>
  );
}

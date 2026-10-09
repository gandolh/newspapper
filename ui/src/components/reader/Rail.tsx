/**
 * The Reader's rail: what to read, and where else to go.
 *
 * Unread and All with their counts; the sources grouped by category,
 * uncategorized last, each with its unread count; Refresh with live
 * per-source progress; and the Search, Library and Sources views.
 *
 * A source whose last refresh failed carries the rubylith word — the one way
 * the board says something is not working — with the reason on hover and, once
 * selected, as a note over the list. A disabled source takes the hatch, the
 * board's "held out" at this scale.
 */
import type { ReaderCounts, Source } from '@/lib/types';
import { Button, HATCH, Mark, ProgressBar, Skeleton } from '../ui';
import { groupSources, sameNarrow, unreadIn, type Narrow, type ReaderScope } from './query';
import styles from './Rail.module.css';

export type ReaderView = 'read' | 'search' | 'library' | 'sources';

export interface SourceProgress {
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

export interface RefreshState {
  progress: Record<string, SourceProgress>;
  /** How many sources this refresh covers. */
  total: number;
}

export interface RailProps {
  view: ReaderView;
  scope: ReaderScope;
  narrow: Narrow;
  sources: Source[] | null;
  counts: ReaderCounts | null;
  failed: boolean;
  refresh: RefreshState | null;
  onRefresh: () => void;
  onRetry: () => void;
  onSelect: (scope: ReaderScope | null, narrow: Narrow) => void;
  onView: (view: ReaderView) => void;
  onLegend: () => void;
}

const VIEWS: Array<{ view: ReaderView; label: string; note: string }> = [
  { view: 'search', label: 'Search', note: 'live keyword search' },
  { view: 'library', label: 'Library', note: 'saved, with notes' },
  { view: 'sources', label: 'Sources', note: 'feeds and categories' },
];

function Count({ n }: { n: number | undefined }) {
  return <span className={styles.count}>{n === undefined ? '' : n}</span>;
}

function ProgressMark({ p }: { p: SourceProgress | undefined }) {
  if (!p) return null;
  if (p.status === 'fetching') return <Mark bare>…</Mark>;
  if (p.status === 'error')
    return (
      <Mark tone="rubylith" bare>
        failed
      </Mark>
    );
  return p.count ? (
    <Mark tone="ink" bare>
      +{p.count}
    </Mark>
  ) : null;
}

export default function Rail(props: RailProps) {
  const { sources, counts, refresh, view, narrow, scope } = props;
  const reading = view === 'read';
  const groups = sources ? groupSources(sources) : [];
  const categorized = groups.some((g) => g.category !== null);
  const settled = refresh
    ? Object.values(refresh.progress).filter((p) => p.status !== 'fetching').length
    : 0;

  function current(isIt: boolean): 'true' | undefined {
    return isIt ? 'true' : undefined;
  }

  return (
    <nav className={styles.rail} aria-label="Reader">
      <div className={styles.head}>
        <h1 className={styles.title}>Reader</h1>
        <Button size="sm" variant="secondary" loading={refresh !== null} onClick={props.onRefresh}>
          Refresh
        </Button>
      </div>

      {refresh && (
        <div className={styles.progress} aria-live="polite">
          <ProgressBar
            value={refresh.total ? Math.round((settled / refresh.total) * 100) : 0}
            label={`Fetching · ${settled} of ${refresh.total}`}
          />
        </div>
      )}

      <ul className={styles.group}>
        <li>
          <button
            type="button"
            className={styles.item}
            aria-current={current(reading && narrow === null && scope === 'unread')}
            onClick={() => props.onSelect('unread', null)}
          >
            <span className={styles.label}>Unread</span>
            <Count n={counts?.unread} />
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.item}
            aria-current={current(reading && narrow === null && scope === 'all')}
            onClick={() => props.onSelect('all', null)}
          >
            <span className={styles.label}>All</span>
            <Count n={counts?.all} />
          </button>
        </li>
      </ul>

      {props.failed ? (
        <div className={styles.failed}>
          <Mark tone="rubylith">Feeds did not load</Mark>
          <Button size="sm" variant="ghost" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : sources === null ? (
        <div className={styles.loading} role="status">
          <span className={styles.srOnly}>Loading feeds</span>
          <Skeleton height={26} />
          <Skeleton height={26} />
          <Skeleton height={26} />
        </div>
      ) : (
        groups.map((group) => {
          const groupNarrow: Narrow = { kind: 'category', category: group.category };
          return (
            <section key={group.category ?? '\0'} className={styles.section}>
              {categorized && (
                <button
                  type="button"
                  className={`${styles.item} ${styles.category}`}
                  aria-current={current(reading && sameNarrow(narrow, groupNarrow))}
                  onClick={() => props.onSelect(null, groupNarrow)}
                >
                  <span className={styles.label}>{group.category ?? 'Uncategorized'}</span>
                  <Count n={counts ? unreadIn(counts, groupNarrow, sources) : undefined} />
                </button>
              )}
              <ul className={styles.group}>
                {group.sources.map((source) => {
                  const sourceNarrow: Narrow = { kind: 'source', sourceId: source.id };
                  const p = refresh?.progress[source.id];
                  const failing = !p && source.lastError !== null;
                  return (
                    <li key={source.id}>
                      <button
                        type="button"
                        className={[
                          styles.item,
                          styles.source,
                          source.enabled ? '' : `${styles.disabled} ${HATCH}`,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-current={current(reading && sameNarrow(narrow, sourceNarrow))}
                        title={
                          failing
                            ? `Last refresh failed: ${source.lastError}`
                            : source.enabled
                              ? undefined
                              : 'Disabled: not refreshed'
                        }
                        onClick={() => props.onSelect(null, sourceNarrow)}
                      >
                        <span className={styles.label}>{source.name}</span>
                        {failing && (
                          <Mark tone="rubylith" bare>
                            failing
                          </Mark>
                        )}
                        <ProgressMark p={p} />
                        <Count n={counts?.unreadBySource[source.id]} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <section className={styles.views} aria-label="Views">
        <span className={styles.caption}>Views</span>
        <ul className={styles.group}>
          {VIEWS.map((v) => (
            <li key={v.view}>
              <button
                type="button"
                className={styles.item}
                aria-current={current(view === v.view)}
                onClick={() => props.onView(v.view)}
              >
                <span className={styles.label}>{v.label}</span>
                <span className={styles.note}>{v.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className={styles.legend} onClick={props.onLegend}>
        Keyboard shortcuts <kbd className={styles.kbd}>?</kbd>
      </button>
    </nav>
  );
}

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
import type { ReaderCounts, Source } from "@/lib/types";
import { Button, HATCH, Mark, ProgressBar, Skeleton } from "../ui";
import { groupSources, sameNarrow, unreadIn, type Narrow, type ReaderScope } from "./query";
import { cn } from "../../lib/cn";

export type ReaderView = "read" | "search" | "library" | "sources";

export interface SourceProgress {
  status: "fetching" | "done" | "error";
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
  { view: "search", label: "Search", note: "live keyword search" },
  { view: "library", label: "Library", note: "saved, with notes" },
  { view: "sources", label: "Sources", note: "feeds and categories" },
];

function Count({ n }: { n: number | undefined }) {
  return (
    <span className="font-galley text-[11px] font-bold text-graphite tabular-nums">{n === undefined ? "" : n}</span>
  );
}

function ProgressMark({ p }: { p: SourceProgress | undefined }) {
  if (!p) return null;
  if (p.status === "fetching") return <Mark bare>…</Mark>;
  if (p.status === "error")
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

/** One entry: a label, any marks, and a count on the right edge. Printed on the board, no paper, no shadow, like the
 * tray: the current entry is the one pulled forward onto paper. */
const ITEM =
  "flex min-h-unit w-full cursor-pointer items-center gap-hair border-0 bg-transparent px-hair text-left font-chrome text-label font-semibold tracking-label text-graphite hover:bg-graphite/5 aria-[current=true]:relative aria-[current=true]:z-pane aria-[current=true]:bg-paper aria-[current=true]:font-extrabold aria-[current=true]:shadow-waxed";
/** A category heading, set as a field label, still a button: it narrows the list to every source under it. */
const CATEGORY =
  "mt-hair border-b border-rule font-galley text-field font-bold tracking-mark text-graphite-soft uppercase aria-[current=true]:text-graphite";
const LABEL = "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap";

export function Rail(props: RailProps) {
  const { sources, counts, refresh, view, narrow, scope } = props;
  const reading = view === "read";
  const groups = sources ? groupSources(sources) : [];
  const categorized = groups.some((g) => g.category !== null);
  const settled = refresh ? Object.values(refresh.progress).filter((p) => p.status !== "fetching").length : 0;

  function current(isIt: boolean): "true" | undefined {
    return isIt ? "true" : undefined;
  }

  return (
    <nav className="flex flex-col gap-half pb-unit" aria-label="Reader">
      <div className="flex items-center justify-between gap-hair border-b-[1.5px] border-graphite pb-hair">
        <h1 className="font-chrome text-board-title leading-unit font-extrabold tracking-board-title wdth-title">
          Reader
        </h1>
        <Button size="sm" variant="secondary" loading={refresh !== null} onClick={props.onRefresh}>
          Refresh
        </Button>
      </div>

      {refresh && (
        <div className="px-[2px]" aria-live="polite">
          <ProgressBar
            value={refresh.total ? Math.round((settled / refresh.total) * 100) : 0}
            label={`Fetching · ${settled} of ${refresh.total}`}
          />
        </div>
      )}

      <ul className="flex flex-col">
        <li>
          <button
            type="button"
            className={ITEM}
            aria-current={current(reading && narrow === null && scope === "unread")}
            onClick={() => props.onSelect("unread", null)}
          >
            <span className={LABEL}>Unread</span>
            <Count n={counts?.unread} />
          </button>
        </li>
        <li>
          <button
            type="button"
            className={ITEM}
            aria-current={current(reading && narrow === null && scope === "all")}
            onClick={() => props.onSelect("all", null)}
          >
            <span className={LABEL}>All</span>
            <Count n={counts?.all} />
          </button>
        </li>
      </ul>

      {props.failed ? (
        <div className="flex flex-col items-start gap-hair">
          <Mark tone="rubylith">Feeds did not load</Mark>
          <Button size="sm" variant="ghost" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : sources === null ? (
        <div className="flex flex-col gap-hair" role="status">
          <span className="sr-only">Loading feeds</span>
          <Skeleton height={26} />
          <Skeleton height={26} />
          <Skeleton height={26} />
        </div>
      ) : (
        groups.map((group) => {
          const groupNarrow: Narrow = { kind: "category", category: group.category };
          return (
            <section key={group.category ?? "\0"} className="flex flex-col">
              {categorized && (
                <button
                  type="button"
                  className={cn(ITEM, CATEGORY)}
                  aria-current={current(reading && sameNarrow(narrow, groupNarrow))}
                  onClick={() => props.onSelect(null, groupNarrow)}
                >
                  <span className={LABEL}>{group.category ?? "Uncategorized"}</span>
                  <Count n={counts ? unreadIn(counts, groupNarrow, sources) : undefined} />
                </button>
              )}
              <ul className="flex flex-col">
                {group.sources.map((source) => {
                  const sourceNarrow: Narrow = { kind: "source", sourceId: source.id };
                  const p = refresh?.progress[source.id];
                  const failing = !p && source.lastError !== null;
                  return (
                    <li key={source.id}>
                      <button
                        type="button"
                        className={cn(ITEM, "pl-half font-medium", !source.enabled && HATCH)}
                        aria-current={current(reading && sameNarrow(narrow, sourceNarrow))}
                        title={
                          failing
                            ? `Last refresh failed: ${source.lastError}`
                            : source.enabled
                              ? undefined
                              : "Disabled: not refreshed"
                        }
                        onClick={() => props.onSelect(null, sourceNarrow)}
                      >
                        <span className={cn(LABEL, !source.enabled && "italic")}>{source.name}</span>
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

      <section className="flex flex-col gap-[2px] border-t border-rule pt-half" aria-label="Views">
        <span className="px-hair font-galley text-field font-medium tracking-field text-graphite-soft uppercase">
          Views
        </span>
        <ul className="flex flex-col">
          {VIEWS.map((v) => (
            <li key={v.view}>
              <button
                type="button"
                className={ITEM}
                aria-current={current(view === v.view)}
                onClick={() => props.onView(v.view)}
              >
                <span className={LABEL}>{v.label}</span>
                <span className="font-galley text-field font-medium tracking-[0.04em] whitespace-nowrap text-graphite-soft">
                  {v.note}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="mt-hair inline-flex h-unit cursor-pointer items-center gap-hair self-start border border-transparent bg-transparent px-hair font-galley text-field font-medium tracking-field text-graphite-soft uppercase hover:border-tick hover:text-graphite"
        onClick={props.onLegend}
      >
        Keyboard shortcuts{" "}
        <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center border border-tick bg-paper px-[4px] font-galley text-[10px] font-bold text-graphite">
          ?
        </kbd>
      </button>
    </nav>
  );
}

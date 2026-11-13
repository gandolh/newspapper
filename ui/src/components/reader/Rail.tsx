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
import { Button, HATCH, Icon, Mark, ProgressBar, Skeleton, type IconName } from "../ui";
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
  onRetry: () => void;
  onSelect: (scope: ReaderScope | null, narrow: Narrow) => void;
  onView: (view: ReaderView) => void;
  onLegend: () => void;
}

const VIEWS: Array<{ view: ReaderView; label: string; note: string; icon: IconName }> = [
  { view: "search", label: "Search", note: "live keyword search", icon: "search" },
  { view: "library", label: "Library", note: "saved, with notes", icon: "bookmark" },
  { view: "sources", label: "Sources", note: "feeds and categories", icon: "rss" },
];

function Count({ n }: { n: number | undefined }) {
  return <span className="text-hint leading-hint font-semibold tabular-nums">{n === undefined ? "" : n}</span>;
}

function ProgressMark({ p }: { p: SourceProgress | undefined }) {
  if (!p) return null;
  if (p.status === "fetching") return <Mark>…</Mark>;
  if (p.status === "error") return <Mark tone="rubylith">failed</Mark>;
  return p.count ? <Mark tone="ink">+{p.count}</Mark> : null;
}

/** One entry: a label, any marks, and a count on the right edge, 28px (48 on a phone). The current entry is the
 * tinted row with a 3px graphite bar on its left edge. */
const ITEM =
  "flex min-h-[28px] w-full cursor-pointer items-center justify-between gap-tight border-0 border-l-[3px] border-l-transparent bg-transparent px-card text-left font-chrome text-body leading-body font-semibold tracking-label text-graphite hover:bg-graphite/5 aria-[current=true]:border-l-graphite aria-[current=true]:bg-board aria-[current=true]:font-extrabold phone:min-h-(--target) [&_.count]:text-graphite-soft aria-[current=true]:[&_.count]:text-graphite";
/** A category heading, set as a label, still a button: it narrows the list to every source under it. */
const CATEGORY =
  "mt-[4px] min-h-[24px] border-t border-t-hairline pt-snug pb-[2px] text-label leading-label font-semibold text-graphite-soft aria-[current=true]:font-extrabold aria-[current=true]:text-graphite phone:min-h-(--target)";
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
    <nav className="flex flex-col pt-tight pb-snug" aria-label="Feeds">
      {refresh && (
        <div className="px-card pb-tight" aria-live="polite">
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
            <span className="count">
              <Count n={counts?.unread} />
            </span>
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
            <span className="count">
              <Count n={counts?.all} />
            </span>
          </button>
        </li>
      </ul>

      {props.failed ? (
        <div className="flex flex-col items-start gap-hair px-card pt-snug">
          <Mark tone="rubylith" icon="alert">
            Feeds did not load
          </Mark>
          <Button size="sm" variant="secondary" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : sources === null ? (
        <div className="flex flex-col gap-hair px-card pt-snug" role="status">
          <span className="sr-only">Loading feeds</span>
          <Skeleton height={26} />
          <Skeleton height={26} />
          <Skeleton height={26} />
        </div>
      ) : (
        groups.map((group, index) => {
          const groupNarrow: Narrow = { kind: "category", category: group.category };
          return (
            <section key={group.category ?? "\0"} className="flex flex-col">
              {categorized && (
                <button
                  type="button"
                  className={cn(ITEM, CATEGORY, index === 0 && "mt-0 border-t-transparent")}
                  aria-current={current(reading && sameNarrow(narrow, groupNarrow))}
                  onClick={() => props.onSelect(null, groupNarrow)}
                >
                  <span className={LABEL}>{group.category ?? "Uncategorized"}</span>
                  <span className="count">
                    <Count n={counts ? unreadIn(counts, groupNarrow, sources) : undefined} />
                  </span>
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
                        className={cn(ITEM, "pl-[28px] font-medium", !source.enabled && HATCH)}
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
                        {failing && <Mark tone="rubylith">failing</Mark>}
                        <ProgressMark p={p} />
                        <span className="count">
                          <Count n={counts?.unreadBySource[source.id]} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <section className="mt-[4px] flex flex-col border-t border-hairline" aria-label="Views">
        <span className="px-card pt-snug pb-[2px] font-chrome text-label leading-label font-semibold text-graphite-soft">
          Views
        </span>
        <ul className="flex flex-col">
          {VIEWS.map((v) => (
            <li key={v.view}>
              <button
                type="button"
                className={cn(ITEM, "justify-start gap-snug")}
                aria-current={current(view === v.view)}
                onClick={() => props.onView(v.view)}
              >
                <Icon name={v.icon} />
                <span className="whitespace-nowrap">{v.label}</span>
                <span className="ml-auto text-label leading-label font-medium whitespace-nowrap text-graphite-soft">
                  {v.note}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-tight flex items-center gap-[10px] border-t border-hairline px-card pt-snug font-chrome text-label leading-label font-semibold text-graphite-soft">
        <span>Keyboard shortcuts</span>
        <button
          type="button"
          className="inline-grid size-[28px] cursor-pointer place-items-center border border-field-edge bg-paper font-galley text-hint leading-[16px] font-bold text-graphite phone:size-[44px]"
          aria-label="Keyboard shortcuts"
          onClick={props.onLegend}
        >
          ?
        </button>
      </div>
    </nav>
  );
}

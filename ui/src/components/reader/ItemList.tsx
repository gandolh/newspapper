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
import { useEffect, useRef, type ReactNode } from "react";
import type { FeedItemSummary, Source } from "@/lib/types";
import { Button, ChipRow, Finding, Input, Mark, Skeleton } from "../ui";
import { BackControl } from "./BackControl";
import { formatAge } from "./format";
import type { ReaderScope } from "./query";
import { cn } from "../../lib/cn";

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
  { value: "unread", label: "Unread" },
  { value: "all", label: "All" },
];

export function ItemList(props: ItemListProps) {
  const { rows, selectedId } = props;
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the open row in view as j and k walk the list.
  useEffect(() => {
    if (selectedId === null) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);
    row?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="flex min-h-full flex-col gap-half">
      <BackControl label="Feeds" onClick={props.onBack} />

      <header className="flex items-end justify-between gap-half border-b-[1.5px] border-graphite pb-hair">
        <h2 className="min-w-0 overflow-hidden font-chrome text-label leading-unit font-extrabold wdth-brand tracking-brand text-ellipsis whitespace-nowrap uppercase">
          {props.heading}
        </h2>
        <ChipRow
          kind="filter"
          options={SCOPES}
          value={props.scope}
          onValueChange={(v) => props.onScopeChange(v as ReaderScope)}
          ariaLabel="Show"
          pad="hair"
        />
      </header>

      <div className="flex items-start gap-hair *:first:min-w-0 *:first:flex-1">
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
            if (e.key === "Escape") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <Button size="sm" variant="secondary" onClick={props.onMarkAllRead} disabled={!props.canMarkAllRead}>
          Mark all read
        </Button>
      </div>

      {props.failing?.lastError && (
        <Finding where={`${props.failing.name} · last refresh`}>{props.failing.lastError}</Finding>
      )}

      {props.loading ? (
        <div className="flex flex-col gap-hair" role="status">
          <span className="sr-only">Loading items</span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      ) : props.error ? (
        <div className="flex flex-col items-start gap-hair py-half">
          <Mark tone="rubylith">The list did not load</Mark>
          <p className="font-galley text-[10px] text-rubylith-ink">{props.error}</p>
          <Button size="sm" variant="secondary" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        props.empty
      ) : (
        <>
          <ul className="flex flex-col" ref={listRef}>
            {rows.map((row) => {
              const selected = row.id === selectedId;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-item-id={row.id}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-hair border-0 border-b border-hairline bg-transparent px-hair pt-hair pb-[7px] text-left text-graphite hover:bg-graphite/4",
                      // The open row is pulled forward: paper, waxed down, the same mark the tray's current
                      // compartment and a selected node take.
                      selected && "relative z-pane border-b-transparent bg-paper shadow-waxed hover:bg-paper",
                    )}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => props.onOpen(row.id)}
                  >
                    <span
                      className={cn("mt-[6px] size-[7px] shrink-0", !row.read && "bg-graphite")}
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="sr-only">{row.read ? "Read: " : "Unread: "}</span>
                      <span
                        className={cn(
                          "line-clamp-2 overflow-hidden font-chrome text-label leading-label tracking-label",
                          row.read ? "font-medium text-graphite-soft" : "font-extrabold",
                          selected && "text-graphite",
                        )}
                      >
                        {row.title || "Untitled"}
                      </span>
                      <span className="flex min-w-0 items-center gap-hair font-galley text-field leading-field font-medium tracking-field text-graphite-soft uppercase tabular-nums">
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                          {row.sourceName}
                        </span>
                        <span>{formatAge(row.sortAt, props.now)}</span>
                        {row.saved && (
                          <Mark tone="ink" className="ml-auto">
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
          <div className="flex justify-center py-half">
            {props.nextCursor ? (
              <Button size="sm" variant="secondary" loading={props.loadingMore} onClick={props.onLoadMore}>
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

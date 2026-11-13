/**
 * The Reader's list: a filter, Mark all read, the rows, and Load more.
 *
 * In Unread every row is unread and is set bold. In All an unread row carries a 6px graphite square, and a read row
 * drops to medium weight; neither is ever said by colour alone. The source, the
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

  const scopeRow = (
    <ChipRow
      kind="filter"
      options={SCOPES}
      value={props.scope}
      onValueChange={(v) => props.onScopeChange(v as ReaderScope)}
      ariaLabel="Show"
      pad="hair"
    />
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="hidden items-center justify-between gap-tight px-card py-snug reader-narrow:flex">
        <BackControl label="Feeds" onClick={props.onBack} />
        {scopeRow}
      </div>

      <header className="flex min-h-[40px] items-center justify-between gap-tight px-card pt-tight reader-narrow:hidden">
        <h2 className="min-w-0 overflow-hidden font-chrome text-section leading-section font-extrabold text-ellipsis whitespace-nowrap text-graphite-deep wdth-head">
          {props.heading}
        </h2>
        {scopeRow}
      </header>

      <div className="flex items-center gap-tight px-card py-tight [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1">
        <Input
          id={props.filterId}
          type="text"
          role="searchbox"
          placeholder="Filter: budget, tax"
          aria-label="Filter items (comma-separated terms, any one matches)"
          value={props.filterInput}
          onChange={(e) => props.onFilterChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <Button variant="secondary" onClick={props.onMarkAllRead} disabled={!props.canMarkAllRead}>
          Mark all read
        </Button>
      </div>

      {props.failing?.lastError && (
        <div className="px-card">
          <Finding where={`${props.failing.name} · last refresh`}>{props.failing.lastError}</Finding>
        </div>
      )}

      {props.loading ? (
        <div className="flex flex-col gap-hair px-card py-tight" role="status">
          <span className="sr-only">Loading items</span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      ) : props.error ? (
        <div className="flex flex-col items-start gap-hair px-card py-snug">
          <Mark tone="rubylith" icon="alert">
            The list did not load
          </Mark>
          <p className="text-hint leading-hint font-medium text-grease">{props.error}</p>
          <Button variant="secondary" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-card py-tight">{props.empty}</div>
      ) : (
        <>
          <ul className="flex flex-col border-t border-hairline" ref={listRef}>
            {rows.map((row) => {
              const selected = row.id === selectedId;
              // In All, an unread row carries the square and a read row drops to medium weight; in Unread every
              // row is unread, so neither is needed.
              const all = props.scope === "all";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-item-id={row.id}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-tight border-0 border-b border-hairline bg-transparent px-card py-[6px] text-left text-graphite hover:bg-graphite/4 phone:py-snug",
                      selected && "bg-board shadow-[inset_3px_0_0_var(--color-graphite)] hover:bg-board",
                    )}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => props.onOpen(row.id)}
                  >
                    {all && (
                      <span
                        className={cn("mt-[6px] size-[6px] shrink-0", !row.read && "bg-graphite")}
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="sr-only">{row.read ? "Read: " : "Unread: "}</span>
                      <span
                        className={cn(
                          "font-chrome text-body leading-[18px] text-pretty wdth-narrow",
                          all && row.read ? "font-medium text-graphite-soft" : "font-bold",
                        )}
                      >
                        {row.title || "Untitled"}
                      </span>
                      <span className="flex min-w-0 items-center gap-tight text-label leading-label font-medium text-graphite-soft tabular-nums">
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                          {row.sourceName} · {formatAge(row.sortAt, props.now)}
                        </span>
                        {row.saved && (
                          <Mark tone="ink" className="ml-auto" icon="bookmark">
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
          <div className="flex justify-center px-card py-snug">
            {props.nextCursor ? (
              <Button variant="secondary" loading={props.loadingMore} onClick={props.onLoadMore}>
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

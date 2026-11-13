/**
 * The Reader's Sources view.
 *
 * There is no /sources route — feed management was folded into the articles
 * sheet on 2026-08-27, and that sheet became the Reader on 2026-10-09 — so this is
 * a view of the Reader and not an island of its own: it renders inside
 * `ReaderIsland`'s `ToastProvider` and carries no provider of its own. It
 * got a module on 2026-08-31; the Reader moved it, unchanged in how it looks, and gave
 * a feed a **category** (the Reader's rail groups by it) and a health cell that
 * reports the Reader's last refresh when no ping has been taken.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Icon,
  Input,
  Toggle,
  Mark,
  Skeleton,
  EmptyState,
  Modal,
  PageHeader,
  useToast,
  ConfirmDialog,
} from "../../ui";
import { api, ApiError } from "@/lib/api";
import type { Source } from "@/lib/types";
import { formatDate } from "../format";
import { cn } from "../../../lib/cn";
import { CLIPPING } from "./clippingLooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PingResult {
  ok: boolean;
  itemCount?: number;
  error?: string;
  latencyMs?: number;
}

type PingState = { loading: boolean; result?: PingResult };
type PingMap = Record<string, PingState>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function truncateUrl(url: string, max = 55): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

// ---------------------------------------------------------------------------
// PingMark — the feed's health, said as a mark. Never a coloured pill.
// ---------------------------------------------------------------------------

function PingMark({ state }: { state: PingState }) {
  if (state.loading) {
    return <Mark>Pinging…</Mark>;
  }
  if (!state.result) return null;

  const { ok, itemCount, latencyMs, error } = state.result;
  if (ok) {
    const label = ["ok", itemCount != null ? `${itemCount} items` : null, latencyMs != null ? `${latencyMs}ms` : null]
      .filter(Boolean)
      .join(" · ");
    return <Mark tone="ink">{label}</Mark>;
  }
  return (
    <span title={error ?? "Unknown error"}>
      <Mark tone="rubylith">error{error ? " ⓘ" : ""}</Mark>
    </span>
  );
}

// ---------------------------------------------------------------------------
// RefreshMark — the Reader's last refresh of the feed, when no ping has been
// taken. The same marks as a ping: a failure is the rubylith word, its reason
// on hover; a success says when.
// ---------------------------------------------------------------------------

function RefreshMark({ source }: { source: Source }) {
  if (source.lastError) {
    return (
      <span title={source.lastError}>
        <Mark tone="rubylith">failing</Mark>
      </span>
    );
  }
  if (source.lastFetchedAt) {
    return <Mark>fetched {formatDate(source.lastFetchedAt)}</Mark>;
  }
  return <span className="text-[12px] text-graphite-soft">—</span>;
}

// ---------------------------------------------------------------------------
// CopyableUrl
// ---------------------------------------------------------------------------

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span className="inline-flex items-center gap-hair">
      <span
        className="cursor-pointer [font-family:monospace] text-[12px] text-graphite-soft"
        title={`Click to copy: ${url}`}
        onClick={handleCopy}
      >
        {truncateUrl(url)}
      </span>
      {copied && <span className="text-label text-graphite">copied!</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SourceFormModal
// ---------------------------------------------------------------------------

interface SourceFormModalProps {
  open: boolean;
  source: Source | null; // null = add mode
  /** Every category already in use, offered as suggestions. */
  categories: string[];
  onClose: () => void;
  onSaved: (sources: Source[]) => void;
}

/**
 * The form is seeded straight from `source` rather than copied into state by an
 * effect on open. `SourcesPanel` bumps `formKey` when it opens the modal, so a
 * fresh instance mounts already holding the right values — no first render
 * showing the previous feed's details, and no second render to correct it.
 * The key is bumped on open only, never on close, so the dialog still animates
 * out of an intact tree.
 */
function SourceFormModal({ open, source, categories, onClose, onSaved }: SourceFormModalProps) {
  const isEdit = source !== null;
  const { addToast } = useToast();

  const [name, setName] = useState(source?.name ?? "");
  const [rss, setRss] = useState(source?.rss ?? "");
  const [id, setId] = useState(source?.id ?? "");
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [category, setCategory] = useState(source?.category ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * In add mode the id is slugged from the name as you type — from the
   * keystroke, not from a lifecycle. Doing it here rather than in an effect is
   * also what lets the field stay editable: the slug is a consequence of
   * changing the name, so typing directly into the id field survives.
   */
  function handleNameChange(next: string) {
    setName(next);
    if (!isEdit) setId(slugify(next));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!rss.trim()) {
      errs.rss = "RSS URL is required";
    } else if (!isValidUrl(rss.trim())) {
      errs.rss = "Must be a valid URL (include https://)";
    }
    if (!id.trim()) errs.id = "ID is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let result: Source[];
      if (isEdit) {
        result = await api<Source[]>(`/api/sources/${source.id}`, {
          method: "PUT",
          json: { name: name.trim(), rss: rss.trim(), enabled, category: category.trim() || null },
        });
        addToast(`"${name}" updated`, "success");
      } else {
        result = await api<Source[]>("/api/sources", {
          method: "POST",
          json: {
            id: id.trim(),
            name: name.trim(),
            rss: rss.trim(),
            enabled,
            category: category.trim() || null,
          },
        });
        addToast(`"${name}" added`, "success");
      }
      onSaved(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ id: "A source with this ID already exists" });
      } else {
        addToast((err as Error).message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit source" : "Add source"}
      width={520}
      dismissOnBackdrop={false}
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="flex flex-col gap-[16px]">
          <Input
            label="Name"
            placeholder="BBC News"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={errors.name}
            data-autofocus
          />
          <Input
            label="RSS URL"
            placeholder="https://feeds.bbci.co.uk/news/rss.xml"
            value={rss}
            onChange={(e) => setRss(e.target.value)}
            error={errors.rss}
            type="url"
          />
          <Input
            label="ID"
            placeholder="bbc-news"
            value={id}
            onChange={(e) => setId(e.target.value)}
            error={errors.id}
            readOnly={isEdit}
            hint={isEdit ? "ID cannot be changed after creation" : "Auto-generated from name; must be unique"}
          />
          <Input
            label="Category"
            placeholder="News"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="source-categories"
            hint="Groups the feed in the Reader. Leave blank for Uncategorized."
          />
          <datalist id="source-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Toggle
            label="Enabled"
            checked={enabled}
            onCheckedChange={(c) => setEnabled(c)}
            hint="Disabled feeds are skipped by Refresh and by Search"
          />
        </div>
        <div className="mt-[24px] flex justify-end gap-[8px]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add source"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SourcesPanel
// ---------------------------------------------------------------------------

const COLUMNS: Array<{ label: string; center: boolean }> = [
  { label: "Feed", center: false },
  { label: "Category", center: false },
  { label: "RSS URL", center: false },
  { label: "Enabled", center: true },
  { label: "Health", center: false },
  { label: "", center: true },
];

export function SourcesPanel() {
  const { addToast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<PingMap>({});
  const [pingAllLoading, setPingAllLoading] = useState(false);

  // Modal state. `formKey` remounts the form on each open so it seeds itself
  // from `editTarget` instead of being repopulated by an effect.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Source | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load sources
  const loadSources = useCallback(async () => {
    try {
      const data = await api<Source[]>("/api/sources");
      setSources(data);
    } catch {
      addToast("Failed to load sources", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const categories = useMemo(
    () => [...new Set(sources.map((s) => s.category?.trim()).filter((c): c is string => !!c))].sort(),
    [sources],
  );

  // Toggle enabled
  async function handleToggle(source: Source, enabled: boolean) {
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled } : s)));
    try {
      await api(`/api/sources/${source.id}`, {
        method: "PUT",
        json: { enabled },
      });
    } catch {
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: !enabled } : s)));
      addToast("Failed to update source", "error");
    }
  }

  // Ping single
  async function handlePing(source: Source) {
    setPings((p) => ({ ...p, [source.id]: { loading: true } }));
    try {
      const result = await api<PingResult>(`/api/sources/${source.id}/ping`, {
        method: "POST",
      });
      setPings((p) => ({ ...p, [source.id]: { loading: false, result } }));
    } catch (err) {
      setPings((p) => ({
        ...p,
        [source.id]: {
          loading: false,
          result: { ok: false, error: (err as Error).message },
        },
      }));
    }
  }

  // Ping all
  async function handlePingAll() {
    setPingAllLoading(true);
    await Promise.all(sources.map((s) => handlePing(s)));
    setPingAllLoading(false);
  }

  // Open add modal
  function handleAdd() {
    setEditTarget(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  // Open edit modal
  function handleEdit(source: Source) {
    setEditTarget(source);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await api<Source[]>(`/api/sources/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setSources(result);
      addToast(`"${deleteTarget.name}" deleted`, "success");
      setDeleteTarget(null);
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={CLIPPING.loadingList}>
        <Skeleton height={78} />
        <Skeleton height={78} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Sources"
        subtitle="The feeds the Reader follows and Search scans."
        actions={
          <>
            {sources.length > 0 && (
              <Button variant="secondary" size="sm" loading={pingAllLoading} onClick={() => void handlePingAll()}>
                Ping all
              </Button>
            )}
            <Button size="sm" onClick={handleAdd}>
              + Add source
            </Button>
          </>
        }
      />

      {/* Empty state */}
      {sources.length === 0 ? (
        <EmptyState
          icon={<Icon name="plus" size={28} />}
          title="No sources yet"
          hint="Add your first RSS feed. The Reader stores what it publishes; Search reads it live."
          action={<Button onClick={handleAdd}>Add first feed</Button>}
        />
      ) : (
        <div className="border border-hairline">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-hairline bg-board">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      className={cn(
                        "px-snug py-[10px] text-left text-label leading-label font-semibold whitespace-nowrap text-graphite-soft",
                        col.center && "text-center",
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="not-last:border-b not-last:border-hairline">
                    <td className="px-snug py-[12px]">
                      <span className="text-[14px] font-semibold">{source.name}</span>
                      <div className="mt-[2px] text-label leading-label text-graphite-soft">{source.id}</div>
                    </td>
                    <td className="px-snug py-[12px]">
                      {source.category ? (
                        <span className="text-label leading-label font-semibold text-graphite">{source.category}</span>
                      ) : (
                        <span className="text-[12px] text-graphite-soft">—</span>
                      )}
                    </td>
                    <td className="px-snug py-[12px]">
                      <CopyableUrl url={source.rss} />
                    </td>
                    <td className="px-snug py-[12px] text-center">
                      <Toggle
                        checked={source.enabled}
                        onCheckedChange={(c) => void handleToggle(source, c)}
                        aria-label={`Enable ${source.name}`}
                      />
                    </td>
                    <td className="px-snug py-[12px]">
                      {pings[source.id] ? <PingMark state={pings[source.id]} /> : <RefreshMark source={source} />}
                    </td>
                    <td className="px-snug py-[12px]">
                      <div className="flex justify-end gap-hair">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handlePing(source)}
                          disabled={pings[source.id]?.loading}
                          title="Ping this feed"
                        >
                          Ping
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(source)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(source)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      <SourceFormModal
        key={formKey}
        open={modalOpen}
        source={editTarget}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSaved={(updated) => setSources(updated)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Delete source?"
        message={`Remove "${deleteTarget?.name}"? This won't affect already-scraped articles.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={deleteLoading}
      />
    </div>
  );
}

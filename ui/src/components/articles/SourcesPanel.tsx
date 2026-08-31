/**
 * The Sources tab of /articles.
 *
 * There is no /sources route — brief 60 folded feed management into the
 * articles sheet — so this is a panel of that sheet and not an island of its
 * own: it renders inside `ArticlesIsland`'s `ToastProvider` and carries no
 * provider of its own. Brief 69 moved it here and gave it a module; nothing
 * about how it looks changed.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Input,
  Toggle,
  Mark,
  Skeleton,
  EmptyState,
  Modal,
  PageHeader,
  useToast,
  ConfirmDialog,
} from '../ui';
import { api, ApiError } from '@/lib/api';
import type { SourceConfig } from '@/lib/types';
import styles from './SourcesPanel.module.css';

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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
  return url.length > max ? url.slice(0, max) + '…' : url;
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
    const label = [
      'ok',
      itemCount != null ? `${itemCount} items` : null,
      latencyMs != null ? `${latencyMs}ms` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return <Mark tone="ink">{label}</Mark>;
  }
  return (
    <span title={error ?? 'Unknown error'}>
      <Mark tone="rubylith">error{error ? ' ⓘ' : ''}</Mark>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CopyableUrl
// ---------------------------------------------------------------------------

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span className={styles.copyable}>
      <span className={styles.copyableUrl} title={`Click to copy: ${url}`} onClick={handleCopy}>
        {truncateUrl(url)}
      </span>
      {copied && <span className={styles.copiedNote}>copied!</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SourceFormModal
// ---------------------------------------------------------------------------

interface SourceFormModalProps {
  open: boolean;
  source: SourceConfig | null; // null = add mode
  onClose: () => void;
  onSaved: (sources: SourceConfig[]) => void;
}

function SourceFormModal({ open, source, onClose, onSaved }: SourceFormModalProps) {
  const isEdit = source !== null;
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [rss, setRss] = useState('');
  const [id, setId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when opening
  useEffect(() => {
    if (!open) return;
    if (source) {
      setName(source.name);
      setRss(source.rss);
      setId(source.id);
      setEnabled(source.enabled);
    } else {
      setName('');
      setRss('');
      setId('');
      setEnabled(true);
    }
    setErrors({});
  }, [open, source]);

  // Auto-slug id from name in add mode
  useEffect(() => {
    if (!isEdit) {
      setId(slugify(name));
    }
  }, [name, isEdit]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!rss.trim()) {
      errs.rss = 'RSS URL is required';
    } else if (!isValidUrl(rss.trim())) {
      errs.rss = 'Must be a valid URL (include https://)';
    }
    if (!id.trim()) errs.id = 'ID is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let result: SourceConfig[];
      if (isEdit) {
        result = await api<SourceConfig[]>(`/api/sources/${source!.id}`, {
          method: 'PUT',
          json: { name: name.trim(), rss: rss.trim(), enabled },
        });
        addToast(`"${name}" updated`, 'success');
      } else {
        result = await api<SourceConfig[]>('/api/sources', {
          method: 'POST',
          json: { id: id.trim(), name: name.trim(), rss: rss.trim(), enabled },
        });
        addToast(`"${name}" added`, 'success');
      }
      onSaved(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ id: 'A source with this ID already exists' });
      } else {
        addToast((err as Error).message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit source' : 'Add source'} width={520}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formFields}>
          <Input
            label="Name"
            placeholder="BBC News"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
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
            hint={
              isEdit
                ? 'ID cannot be changed after creation'
                : 'Auto-generated from name; must be unique'
            }
          />
          <Toggle
            label="Enabled"
            checked={enabled}
            onCheckedChange={(c) => setEnabled(c)}
            hint="Disabled feeds are skipped during scraping"
          />
        </div>
        <div className={styles.formActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save changes' : 'Add source'}
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
  { label: 'Feed', center: false },
  { label: 'RSS URL', center: false },
  { label: 'Enabled', center: true },
  { label: 'Health', center: false },
  { label: '', center: true },
];

export default function SourcesPanel() {
  const { addToast } = useToast();
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<PingMap>({});
  const [pingAllLoading, setPingAllLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SourceConfig | null>(null);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<SourceConfig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load sources
  const loadSources = useCallback(async () => {
    try {
      const data = await api<SourceConfig[]>('/api/sources');
      setSources(data);
    } catch {
      addToast('Failed to load sources', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  // Toggle enabled
  async function handleToggle(source: SourceConfig, enabled: boolean) {
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled } : s)));
    try {
      await api(`/api/sources/${source.id}`, {
        method: 'PUT',
        json: { enabled },
      });
    } catch {
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: !enabled } : s)));
      addToast('Failed to update source', 'error');
    }
  }

  // Ping single
  async function handlePing(source: SourceConfig) {
    setPings((p) => ({ ...p, [source.id]: { loading: true } }));
    try {
      const result = await api<PingResult>(`/api/sources/${source.id}/ping`, {
        method: 'POST',
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
    setModalOpen(true);
  }

  // Open edit modal
  function handleEdit(source: SourceConfig) {
    setEditTarget(source);
    setModalOpen(true);
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await api<SourceConfig[]>(`/api/sources/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setSources(result);
      addToast(`"${deleteTarget.name}" deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingList}>
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
        subtitle="RSS feeds scraped daily during each run."
        actions={
          <>
            {sources.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                loading={pingAllLoading}
                onClick={handlePingAll}
              >
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
          icon="⊕"
          title="No sources yet"
          hint="Add your first RSS feed to get started. Sources are scraped daily when you run the pipeline."
          action={<Button onClick={handleAdd}>Add first feed</Button>}
        />
      ) : (
        <Card padding="none">
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.headRow}>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      className={col.center ? `${styles.th} ${styles.thCenter}` : styles.th}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className={styles.row}>
                    <td className={styles.td}>
                      <span className={styles.feedName}>{source.name}</span>
                      <div className={styles.feedId}>{source.id}</div>
                    </td>
                    <td className={styles.td}>
                      <CopyableUrl url={source.rss} />
                    </td>
                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      <Toggle
                        checked={source.enabled}
                        onCheckedChange={(c) => handleToggle(source, c)}
                        aria-label={`Enable ${source.name}`}
                      />
                    </td>
                    <td className={styles.td}>
                      {pings[source.id] ? (
                        <PingMark state={pings[source.id]} />
                      ) : (
                        <span className={styles.unpinged}>—</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePing(source)}
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
        </Card>
      )}

      {/* Add/Edit modal */}
      <SourceFormModal
        open={modalOpen}
        source={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={(updated) => setSources(updated)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete source?"
        message={`Remove "${deleteTarget?.name}"? This won't affect already-scraped articles.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={deleteLoading}
      />
    </div>
  );
}

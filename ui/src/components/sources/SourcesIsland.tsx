import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Input,
  Toggle,
  Badge,
  Spinner,
  EmptyState,
  Modal,
  ToastProvider,
  useToast,
  ConfirmDialog,
} from '../ui';
import { api, ApiError } from '@/lib/api';
import type { SourceConfig } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PingResult {
  ok: boolean;
  itemCount?: number;
  error?: string;
  latencyMs?: number;
}

type PingMap = Record<string, { loading: boolean; result?: PingResult }>;

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
// PingBadge
// ---------------------------------------------------------------------------

function PingBadge({ state }: { state: { loading: boolean; result?: PingResult } }) {
  if (state.loading) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Spinner size={13} color="var(--muted)" />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>pinging…</span>
      </span>
    );
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
    return <Badge variant="success">{label}</Badge>;
  }
  return (
    <span title={error ?? 'Unknown error'}>
      <Badge variant="error">error{error ? ' ⓘ' : ''}</Badge>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SourceRow
// ---------------------------------------------------------------------------

interface SourceRowProps {
  source: SourceConfig;
  ping: { loading: boolean; result?: PingResult } | undefined;
  onToggle: (source: SourceConfig, enabled: boolean) => void;
  onPing: (source: SourceConfig) => void;
  onEdit: (source: SourceConfig) => void;
  onDelete: (source: SourceConfig) => void;
}

function SourceRow({ source, ping, onToggle, onPing, onEdit, onDelete }: SourceRowProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(source.rss).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <tr>
      <td>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{source.name}</span>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{source.id}</div>
      </td>
      <td>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'var(--muted)',
            cursor: 'pointer',
            textDecoration: 'underline dotted',
          }}
          title={source.rss}
          onClick={handleCopy}
        >
          {truncateUrl(source.rss)}
        </span>
        {copied && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--success)' }}>copied!</span>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        <Toggle
          checked={source.enabled}
          onChange={(e) => onToggle(source, e.target.checked)}
          aria-label={`Enable ${source.name}`}
        />
      </td>
      <td>
        {ping ? (
          <PingBadge state={ping} />
        ) : (
          <span style={{ fontSize: 12, color: 'var(--surface-dim)' }}>—</span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPing(source)}
            disabled={ping?.loading}
            title="Ping this feed"
          >
            Ping
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(source)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(source)}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            hint={isEdit ? 'ID cannot be changed after creation' : 'Auto-generated from name; must be unique'}
          />
          <Toggle
            label="Enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            hint="Disabled feeds are skipped during scraping"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
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
// SourcesPage (inner — needs toast context)
// ---------------------------------------------------------------------------

function SourcesPage() {
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
      await api(`/api/sources/${source.id}`, { method: 'PUT', json: { enabled } });
    } catch {
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: !enabled } : s)));
      addToast('Failed to update source', 'error');
    }
  }

  // Ping single
  async function handlePing(source: SourceConfig) {
    setPings((p) => ({ ...p, [source.id]: { loading: true } }));
    try {
      const result = await api<PingResult>(`/api/sources/${source.id}/ping`, { method: 'POST' });
      setPings((p) => ({ ...p, [source.id]: { loading: false, result } }));
    } catch (err) {
      setPings((p) => ({
        ...p,
        [source.id]: { loading: false, result: { ok: false, error: (err as Error).message } },
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <Spinner size={28} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--on-surface)',
            }}
          >
            Sources
          </h1>
          <p style={{ marginTop: 4, fontSize: 14, color: 'var(--muted)' }}>
            RSS feeds scraped daily during each run.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
      </div>

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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-low)',
                }}
              >
                {['Feed', 'RSS URL', 'Enabled', 'Health', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: h === '' || h === 'Enabled' ? 'center' : 'left',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((source, idx) => (
                <tr
                  key={source.id}
                  style={{
                    borderBottom:
                      idx < sources.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  {/* Inline SourceRow cells for styling */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{source.name}</span>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {source.id}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <CopyableUrl url={source.rss} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Toggle
                      checked={source.enabled}
                      onChange={(e) => handleToggle(source, e.target.checked)}
                      aria-label={`Enable ${source.name}`}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {pings[source.id] ? (
                      <PingBadge state={pings[source.id]} />
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--surface-dim)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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

// ---------------------------------------------------------------------------
// CopyableUrl helper
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: 'var(--muted)',
          cursor: 'pointer',
        }}
        title={`Click to copy: ${url}`}
        onClick={handleCopy}
      >
        {truncateUrl(url)}
      </span>
      {copied && <span style={{ fontSize: 11, color: 'var(--success)' }}>copied!</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Export (wrapped in ToastProvider)
// ---------------------------------------------------------------------------

export default function SourcesIsland() {
  return (
    <ToastProvider>
      <SourcesPage />
    </ToastProvider>
  );
}

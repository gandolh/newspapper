/**
 * TopBar — template picker + mode toggle + actions (save, revert, duplicate, delete, new).
 */

import { useState } from 'react';
import type { TemplateDoc } from '../../lib/types';
import type { CanvasMode } from './useBuilderStore';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Input from '../ui/Input';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { starterRoot } from './types';

interface TopBarProps {
  themes: string[];
  theme: string;
  onThemeChange: (t: string) => void;
  templates: TemplateDoc[];
  selectedId: string | null;
  onSelectTemplate: (id: string) => void;
  onDocLoaded: (doc: TemplateDoc) => void;
  doc: TemplateDoc | null;
  dirty: boolean;
  canvasMode: CanvasMode;
  onCanvasModeChange: (m: CanvasMode) => void;
  onRevert: () => void;
  onSaved: (doc: TemplateDoc) => void;
  onDeleted: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Sample data editor
  onSampleChange: (sample: Record<string, unknown>) => void;
}

// Group templates by family
function groupedOptions(templates: TemplateDoc[]) {
  return templates.map((t) => ({
    value: t.id,
    label: `[${t.family}] ${t.name}`,
  }));
}

export default function TopBar({
  themes,
  theme,
  onThemeChange,
  templates,
  selectedId,
  onSelectTemplate,
  doc,
  dirty,
  canvasMode,
  onCanvasModeChange,
  onRevert,
  onSaved,
  onDeleted,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSampleChange,
}: TopBarProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [revertConfirm, setRevertConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [sampleError, setSampleError] = useState('');

  // Duplicate form
  const [dupId, setDupId] = useState('');
  const [dupName, setDupName] = useState('');
  const [dupError, setDupError] = useState('');
  const [dupLoading, setDupLoading] = useState(false);

  // New form
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFamily, setNewFamily] = useState<'title' | 'body' | 'quote'>('body');
  const [newError, setNewError] = useState('');
  const [newLoading, setNewLoading] = useState(false);

  async function handleSave() {
    if (!doc) return;
    setSaving(true);
    try {
      const saved = await api<TemplateDoc>(`/api/templates/${doc.theme}/${doc.id}`, {
        method: 'PUT',
        json: doc,
      });
      onSaved(saved);
      addToast('Template saved', 'success');
    } catch (err) {
      addToast(`Save failed: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleRevertClick() {
    if (dirty) {
      setRevertConfirm(true);
    } else {
      onRevert();
    }
  }

  async function handleConfirmRevert() {
    setRevertConfirm(false);
    setReverting(true);
    try {
      onRevert();
    } finally {
      setReverting(false);
    }
  }

  async function handleDelete() {
    if (!doc) return;
    setDeleting(true);
    try {
      await api(`/api/templates/${doc.theme}/${doc.id}`, { method: 'DELETE' });
      addToast('Template deleted', 'success');
      onDeleted();
    } catch (err) {
      addToast(`Delete failed: ${(err as Error).message}`, 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function handleDuplicate() {
    if (!doc || !dupId.trim() || !dupName.trim()) {
      setDupError('Both id and name are required');
      return;
    }
    setDupLoading(true);
    setDupError('');
    try {
      const newDoc: TemplateDoc = {
        ...doc,
        id: dupId.trim(),
        name: dupName.trim(),
      };
      const created = await api<TemplateDoc>('/api/templates', {
        method: 'POST',
        json: newDoc,
      });
      addToast(`Duplicated as "${created.name}"`, 'success');
      setDupOpen(false);
      setDupId('');
      setDupName('');
      onSaved(created);
    } catch (err) {
      setDupError((err as Error).message);
    } finally {
      setDupLoading(false);
    }
  }

  async function handleCreate() {
    if (!newId.trim() || !newName.trim()) {
      setNewError('Id and name are required');
      return;
    }
    setNewLoading(true);
    setNewError('');
    try {
      const newDoc: TemplateDoc = {
        id: newId.trim(),
        theme,
        family: newFamily,
        name: newName.trim(),
        fields: [],
        sample: {},
        root: starterRoot(newFamily),
      };
      const created = await api<TemplateDoc>('/api/templates', {
        method: 'POST',
        json: newDoc,
      });
      addToast(`Created "${created.name}"`, 'success');
      setNewOpen(false);
      setNewId('');
      setNewName('');
      onSaved(created);
    } catch (err) {
      setNewError((err as Error).message);
    } finally {
      setNewLoading(false);
    }
  }

  function openSample() {
    setSampleText(doc ? JSON.stringify(doc.sample, null, 2) : '{}');
    setSampleError('');
    setSampleOpen(true);
  }

  function applySample() {
    try {
      const parsed = JSON.parse(sampleText) as Record<string, unknown>;
      onSampleChange(parsed);
      setSampleOpen(false);
      addToast('Sample data updated', 'info');
    } catch {
      setSampleError('Invalid JSON');
    }
  }

  const themeOptions = themes.map((t) => ({ value: t, label: t }));
  const templateOptions = groupedOptions(templates);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-card)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Theme picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Theme</span>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          style={{
            height: 30,
            padding: '0 6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-card)',
            fontSize: 13,
            color: 'var(--on-surface)',
          }}
        >
          {themeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Template picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 220, flex: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Template</span>
        <select
          value={selectedId ?? ''}
          onChange={(e) => onSelectTemplate(e.target.value)}
          style={{
            height: 30,
            padding: '0 6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-card)',
            fontSize: 13,
            color: 'var(--on-surface)',
            flex: 1,
          }}
        >
          {templates.length === 0 && <option value="">No templates</option>}
          {templateOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Canvas mode toggle */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={() => onCanvasModeChange('preview')}
          style={{
            height: 30,
            padding: '0 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
            background: canvasMode === 'preview' ? 'var(--primary)' : 'var(--surface-card)',
            color: canvasMode === 'preview' ? 'var(--on-primary)' : 'var(--on-surface)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Preview
        </button>
        <button
          onClick={() => onCanvasModeChange('edit')}
          style={{
            height: 30,
            padding: '0 10px',
            border: '1px solid var(--border)',
            borderLeft: 'none',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            background: canvasMode === 'edit' ? 'var(--primary)' : 'var(--surface-card)',
            color: canvasMode === 'edit' ? 'var(--on-primary)' : 'var(--on-surface)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Edit
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{
            height: 30, width: 30,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-card)',
            color: canUndo ? 'var(--on-surface)' : 'var(--outline)',
            fontSize: 14,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          style={{
            height: 30, width: 30,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-card)',
            color: canRedo ? 'var(--on-surface)' : 'var(--outline)',
            fontSize: 14,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ↪
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Button
          size="sm"
          variant="secondary"
          onClick={openSample}
          disabled={!doc}
        >
          Sample
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setDupId(''); setDupName(doc ? `${doc.name} copy` : ''); setDupError(''); setDupOpen(true); }}
          disabled={!doc}
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setNewId(''); setNewName(''); setNewError(''); setNewOpen(true); }}
        >
          New
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRevertClick}
          disabled={!doc || reverting}
          loading={reverting}
        >
          Revert
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          disabled={!doc || !dirty || saving}
          loading={saving}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setDeleteConfirm(true)}
          disabled={!doc || deleting}
        >
          Delete
        </Button>
      </div>

      {/* Revert confirm */}
      <ConfirmDialog
        open={revertConfirm}
        onClose={() => setRevertConfirm(false)}
        onConfirm={handleConfirmRevert}
        title="Revert changes?"
        message="This will discard all unsaved changes and reload the template from the server."
        confirmLabel="Revert"
        variant="danger"
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete template?"
        message={`Are you sure you want to delete "${doc?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Duplicate modal */}
      <Modal open={dupOpen} onClose={() => setDupOpen(false)} title="Duplicate template" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="New ID"
            placeholder="e.g. my-custom-title"
            value={dupId}
            onChange={(e) => setDupId(e.target.value)}
          />
          <Input
            label="New Name"
            placeholder="e.g. My Custom Title"
            value={dupName}
            onChange={(e) => setDupName(e.target.value)}
          />
          {dupError && <p style={{ fontSize: 13, color: 'var(--error)' }}>{dupError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setDupOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleDuplicate} loading={dupLoading}>
              Duplicate
            </Button>
          </div>
        </div>
      </Modal>

      {/* New template modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New template" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="ID"
            placeholder="e.g. my-slide-type"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <Input
            label="Name"
            placeholder="e.g. My Slide Type"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Family</label>
            <select
              value={newFamily}
              onChange={(e) => setNewFamily(e.target.value as 'title' | 'body' | 'quote')}
              style={{
                height: 36,
                padding: '0 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-card)',
                fontSize: 13,
              }}
            >
              <option value="title">title</option>
              <option value="body">body</option>
              <option value="quote">quote</option>
            </select>
          </div>
          {newError && <p style={{ fontSize: 13, color: 'var(--error)' }}>{newError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreate} loading={newLoading}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sample data drawer */}
      <Modal open={sampleOpen} onClose={() => setSampleOpen(false)} title="Edit sample data" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            This JSON object is used to populate bindings (e.g. {String.fromCharCode(123,123)}text{String.fromCharCode(125,125)}) in preview and edit mode.
          </p>
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={12}
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              padding: 10,
              border: `1px solid ${sampleError ? 'var(--error)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              resize: 'vertical',
              background: 'var(--surface-card)',
              color: 'var(--on-surface)',
            }}
          />
          {sampleError && <p style={{ fontSize: 12, color: 'var(--error)' }}>{sampleError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setSampleOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applySample}>Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

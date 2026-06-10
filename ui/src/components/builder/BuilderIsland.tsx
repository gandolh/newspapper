/**
 * BuilderIsland — root React island for the template builder page.
 * Wires together TopBar, TreePanel, Canvas, Inspector.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TemplateDoc } from '@/lib/types';
import { ToastProvider, useToast } from '../ui/Toast';
import { useBuilderStore } from './useBuilderStore';
import TopBar from './TopBar';
import TreePanel from './TreePanel';
import Canvas from './Canvas';
import Inspector from './Inspector';
import Spinner from '../ui/Spinner';
import { api } from '@/lib/api';

interface ThemeEntry {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: Record<string, any>;
}

function BuilderContent() {
  const { addToast } = useToast();

  // Themes
  const [themes, setThemes] = useState<ThemeEntry[]>([]);
  const [theme, setTheme] = useState('warm-industrial');
  const [themeData, setThemeData] = useState<ThemeEntry | null>(null);

  // Templates list
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const store = useBuilderStore();

  // Load themes
  useEffect(() => {
    api<ThemeEntry[]>('/api/themes')
      .then((data) => {
        setThemes(data.filter((t) => t.tokens !== null));
        const match = data.find((t) => t.name === theme);
        if (match) setThemeData(match);
      })
      .catch((err) => addToast(`Failed to load themes: ${(err as Error).message}`, 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update themeData when theme changes
  useEffect(() => {
    const match = themes.find((t) => t.name === theme);
    setThemeData(match ?? null);
  }, [theme, themes]);

  // Load templates when theme changes
  const loadTemplates = useCallback(async (themeName: string) => {
    setTemplatesLoading(true);
    try {
      const list = await api<TemplateDoc[]>(`/api/templates?theme=${encodeURIComponent(themeName)}`);
      setTemplates(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        store.loadDoc(list[0]);
      } else {
        setSelectedId(null);
        store.loadDoc(null as unknown as TemplateDoc);
      }
    } catch (err) {
      addToast(`Failed to load templates: ${(err as Error).message}`, 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [store, addToast]);

  useEffect(() => {
    loadTemplates(theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Select a template
  async function handleSelectTemplate(id: string) {
    if (id === selectedId) return;
    if (store.dirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch template?')) return;
    }
    setSelectedId(id);
    try {
      const doc = await api<TemplateDoc>(`/api/templates/${theme}/${id}`);
      store.loadDoc(doc);
    } catch (err) {
      addToast(`Failed to load template: ${(err as Error).message}`, 'error');
    }
  }

  // Revert
  async function handleRevert() {
    if (!selectedId) return;
    try {
      const doc = await api<TemplateDoc>(`/api/templates/${theme}/${selectedId}`);
      store.loadDoc(doc);
      addToast('Reverted to saved version', 'info');
    } catch (err) {
      addToast(`Revert failed: ${(err as Error).message}`, 'error');
    }
  }

  // After save
  function handleSaved(doc: TemplateDoc) {
    store.markClean();
    // Refresh templates list (new item may have been added)
    api<TemplateDoc[]>(`/api/templates?theme=${encodeURIComponent(theme)}`)
      .then((list) => {
        setTemplates(list);
        setSelectedId(doc.id);
        store.loadDoc(doc);
      })
      .catch(() => {/* ignore list refresh error */});
  }

  // After delete
  async function handleDeleted() {
    await loadTemplates(theme);
  }

  // Sample change
  function handleSampleChange(sample: Record<string, unknown>) {
    store.applyChange((doc) => ({ ...doc, sample }));
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Top bar */}
      <TopBar
        themes={themes.map((t) => t.name)}
        theme={theme}
        onThemeChange={(t) => {
          if (store.dirty && !window.confirm('Unsaved changes. Switch theme anyway?')) return;
          setTheme(t);
        }}
        templates={templates}
        selectedId={selectedId}
        onSelectTemplate={handleSelectTemplate}
        onDocLoaded={store.loadDoc}
        doc={store.doc}
        dirty={store.dirty}
        canvasMode={store.canvasMode}
        onCanvasModeChange={store.setCanvasMode}
        onRevert={handleRevert}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={store.undo}
        onRedo={store.redo}
        onSampleChange={handleSampleChange}
      />

      {/* Main three-pane layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left: Tree panel */}
        <div style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--surface-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {templatesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
              <Spinner size={20} color="var(--primary)" />
            </div>
          ) : store.doc ? (
            <TreePanel
              doc={store.doc}
              selectedPath={store.selectedPath}
              onSelectPath={store.setSelectedPath}
              onDocChange={store.applyChange}
            />
          ) : (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
              No template loaded.
            </div>
          )}
        </div>

        {/* Center: Canvas */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {store.doc ? (
            <Canvas
              doc={store.doc}
              theme={theme}
              themeData={themeData}
              selectedPath={store.selectedPath}
              onSelectPath={store.setSelectedPath}
              canvasMode={store.canvasMode}
              onDocChange={store.applyChange}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13 }}>
              {templatesLoading ? <Spinner size={28} color="var(--primary)" /> : 'Select a template to begin.'}
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {store.doc ? (
            <Inspector
              doc={store.doc}
              selectedPath={store.selectedPath}
              onDocChange={store.applyChange}
              themeData={themeData}
            />
          ) : (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
              No template loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuilderIsland() {
  return (
    <ToastProvider>
      <BuilderContent />
    </ToastProvider>
  );
}

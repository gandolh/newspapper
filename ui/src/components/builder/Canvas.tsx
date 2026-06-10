/**
 * Canvas — center pane with two modes:
 * - preview: iframe via POST /api/preview (pixel-true)
 * - edit: recursive React rendering with selection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TNode, TemplateDoc } from '@/lib/types';
import type { NodePath } from './types';
import { pathEquals, nodeChildren } from './types';
import type { CanvasMode } from './useBuilderStore';
import Spinner from '../ui/Spinner';

// ---------------------------------------------------------------------------
// Preview mode (iframe)
// ---------------------------------------------------------------------------

interface PreviewCanvasProps {
  doc: TemplateDoc;
  theme: string;
}

function PreviewCanvas({ doc, theme }: PreviewCanvasProps) {
  const [srcDoc, setSrcDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef('');

  const key = JSON.stringify(doc) + theme;

  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc, data: doc.sample, theme, index: 1, total: 1 }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json() as { error?: string };
            if (j.error) msg = j.error;
          } catch { /* ignore */ }
          setError(msg);
        } else {
          setSrcDoc(await res.text());
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Preview error');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const SCALE = 0.54; // ~582px display
  const displaySize = Math.round(1080 * SCALE);

  return (
    <div style={{ position: 'relative', width: displaySize, height: displaySize, flexShrink: 0, overflow: 'hidden', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
      <iframe
        srcDoc={srcDoc}
        sandbox=""
        title="Template preview"
        style={{
          width: 1080,
          height: 1080,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${SCALE})`,
          display: 'block',
          pointerEvents: 'none',
        }}
      />
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(251,249,248,0.7)' }}>
          <Spinner size={28} color="var(--primary)" />
        </div>
      )}
      {!loading && error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--error-container)', color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit mode — per-node rendering with resolveStyle
// ---------------------------------------------------------------------------

interface EditNodeProps {
  node: TNode;
  path: NodePath;
  selectedPath: NodePath;
  onSelectPath: (path: NodePath) => void;
  themeTokens: Record<string, Record<string, string>>;
  data: Record<string, unknown>;
  // Drag-and-drop
  onDragStart: (path: NodePath) => void;
  onDragOver: (e: React.DragEvent, path: NodePath) => void;
  onDrop: (e: React.DragEvent, path: NodePath) => void;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
}

function resolveStyleBrowser(
  style: Record<string, string | number>,
  themeTokens: Record<string, Record<string, string>>,
): React.CSSProperties {
  const result: React.CSSProperties = {};
  const UNITLESS = new Set(['lineHeight', 'fontWeight', 'opacity', 'flex', 'flexGrow', 'flexShrink', 'zIndex', 'order']);

  const typKey = style['typography'];
  if (typKey !== undefined) {
    const typToken = themeTokens['typography']?.[String(typKey)];
    if (typToken) {
      Object.assign(result, typToken);
    }
  }

  for (const [k, v] of Object.entries(style)) {
    if (k === 'typography') continue;
    let resolved: string;
    if (typeof v === 'number') {
      resolved = UNITLESS.has(k) ? String(v) : `${v}px`;
    } else if (typeof v === 'string' && v.startsWith('$')) {
      const parts = v.slice(1).split('.');
      const group = parts[0];
      const tokenKey = parts.slice(1).join('.');
      const tokenGroup = themeTokens[group] ?? themeTokens[`${group}s`];
      resolved = tokenGroup?.[tokenKey] ?? v;
    } else {
      resolved = String(v);
    }
    // Convert camelCase key to React CSSProperties style key (keep as camelCase)
    (result as Record<string, string>)[k] = resolved;
  }

  return result;
}

function substituteBindings(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.trim().split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = data;
    for (const p of parts) {
      if (cur === null || cur === undefined) return '';
      cur = cur[p];
    }
    return cur === null || cur === undefined ? '' : String(cur);
  });
}

const KIND_COLORS_EDIT: Record<string, string> = {
  box: '#4a7fb5',
  text: 'var(--primary)',
  repeat: '#2e7d32',
};

function EditNode({
  node,
  path,
  selectedPath,
  onSelectPath,
  themeTokens,
  data,
  onDragStart,
  onDragOver,
  onDrop,
  onDocChange,
}: EditNodeProps) {
  const isSelected = pathEquals(path, selectedPath);
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resolvedStyle = node.style ? resolveStyleBrowser(node.style, themeTokens) : {};
  const cssStyle: React.CSSProperties = {
    ...resolvedStyle,
    outline: isSelected
      ? '2px solid var(--primary)'
      : hovered
      ? '1px dashed var(--outline-variant)'
      : 'none',
    outlineOffset: isSelected ? '1px' : '0px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSelectPath(path);
  }

  function handleDragStart(e: React.DragEvent) {
    if (path.length === 0) { e.preventDefault(); return; }
    e.stopPropagation();
    onDragStart(path);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
    onDragOver(e, path);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDrop(e, path);
  }

  if (node.kind === 'text') {
    const text = substituteBindings(node.text, data);
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable={path.length > 0}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...cssStyle,
          ...(dragOver ? { outline: '2px dashed var(--primary)', outlineOffset: 2 } : {}),
        }}
      >
        {/* Raw text (with bindings visible if not substituted) */}
        <span style={{ pointerEvents: 'none' }}>{text || node.text}</span>
        {isSelected && (
          <span style={{
            position: 'absolute',
            top: -1,
            right: -1,
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: '0 0 0 4px',
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}>
            T
          </span>
        )}
      </div>
    );
  }

  if (node.kind === 'box' || node.kind === 'repeat') {
    const children = nodeChildren(node);
    let renderChildren: React.ReactNode;

    if (node.kind === 'repeat') {
      const items = Array.isArray(data[node.source]) ? (data[node.source] as unknown[]) : [];
      renderChildren = items.length > 0
        ? items.map((item, i) => {
            const itemData: Record<string, unknown> = {
              ...data,
              i: i + 1,
              item: typeof item === 'object' && item !== null ? item : item,
            };
            return children.map((child, ci) => (
              <EditNode
                key={`${i}-${ci}`}
                node={child}
                path={[...path, ci]}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
                themeTokens={themeTokens}
                data={itemData}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDocChange={onDocChange}
              />
            ));
          })
        : children.map((child, ci) => (
            <EditNode
              key={ci}
              node={child}
              path={[...path, ci]}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              themeTokens={themeTokens}
              data={data}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDocChange={onDocChange}
            />
          ));
    } else {
      renderChildren = children.map((child, ci) => (
        <EditNode
          key={ci}
          node={child}
          path={[...path, ci]}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          themeTokens={themeTokens}
          data={data}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDocChange={onDocChange}
        />
      ));
    }

    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable={path.length > 0}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...cssStyle,
          ...(dragOver ? { outline: '2px dashed var(--primary)', outlineOffset: 2 } : {}),
        }}
      >
        {renderChildren}
        {isSelected && (
          <span style={{
            position: 'absolute',
            top: -1,
            right: -1,
            background: KIND_COLORS_EDIT[node.kind],
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: '0 0 0 4px',
            pointerEvents: 'none',
            lineHeight: 1.4,
            zIndex: 1000,
          }}>
            {node.kind === 'repeat' ? `↻ ${node.source}` : '▢'}
          </span>
        )}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Canvas
// ---------------------------------------------------------------------------

interface CanvasProps {
  doc: TemplateDoc;
  theme: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeData: { name: string; tokens: Record<string, any> } | null;
  selectedPath: NodePath;
  onSelectPath: (path: NodePath) => void;
  canvasMode: CanvasMode;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
}

export default function Canvas({
  doc,
  theme,
  themeData,
  selectedPath,
  onSelectPath,
  canvasMode,
  onDocChange,
}: CanvasProps) {
  const SCALE = 0.54;
  const displaySize = Math.round(1080 * SCALE);

  const dragSourceRef = useRef<NodePath | null>(null);
  const dropTargetRef = useRef<NodePath | null>(null);

  const handleDragStart = useCallback((path: NodePath) => {
    dragSourceRef.current = path;
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, path: NodePath) => {
    dropTargetRef.current = path;
  }, []);

  const handleDrop = useCallback((_e: React.DragEvent, targetPath: NodePath) => {
    const srcPath = dragSourceRef.current;
    if (!srcPath) return;
    if (pathEquals(srcPath, targetPath)) return;

    // Only reorder siblings (same parent, different index)
    if (srcPath.length === 0 || targetPath.length === 0) return;
    const srcParent = srcPath.slice(0, -1);
    const tgtParent = targetPath.slice(0, -1);
    if (!pathEquals(srcParent, tgtParent)) return; // different parents — skip

    const srcIdx = srcPath[srcPath.length - 1];
    const tgtIdx = targetPath[targetPath.length - 1];

    onDocChange((doc) => {
      // Get parent node
      const getNode = (root: TNode, path: NodePath): TNode | undefined => {
        let cur: TNode = root;
        for (const i of path) {
          const ch = nodeChildren(cur);
          if (i >= ch.length) return undefined;
          cur = ch[i];
        }
        return cur;
      };

      const parent = getNode(doc.root, srcParent);
      if (!parent) return doc;
      const children = [...nodeChildren(parent)];
      if (srcIdx >= children.length || tgtIdx >= children.length) return doc;

      // Swap
      const [removed] = children.splice(srcIdx, 1);
      children.splice(tgtIdx, 0, removed);

      // Rebuild tree
      const rebuildAt = (root: TNode, path: NodePath, newChildren: TNode[]): TNode => {
        if (path.length === 0) {
          if (root.kind === 'box') return { ...root, children: newChildren };
          if (root.kind === 'repeat') return { ...root, children: newChildren };
          return root;
        }
        const idx = path[0];
        const ch = nodeChildren(root);
        const newCh = [...ch];
        newCh[idx] = rebuildAt(newCh[idx], path.slice(1), newChildren);
        if (root.kind === 'box') return { ...root, children: newCh };
        if (root.kind === 'repeat') return { ...root, children: newCh };
        return root;
      };

      return { ...doc, root: rebuildAt(doc.root, srcParent, children) };
    });

    // Update selection to follow the moved node
    onSelectPath([...srcParent, tgtIdx]);
    dragSourceRef.current = null;
  }, [onDocChange, onSelectPath]);

  const themeTokens = themeData?.tokens ?? {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--surface-low)',
      overflow: 'auto',
      padding: 24,
    }}>
      <div style={{
        width: displaySize,
        height: displaySize,
        flexShrink: 0,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        background: '#fff',
        position: 'relative',
      }}>
        {canvasMode === 'preview' ? (
          <PreviewCanvas doc={doc} theme={theme} />
        ) : (
          <div
            style={{
              width: 1080,
              height: 1080,
              transformOrigin: 'top left',
              transform: `scale(${SCALE})`,
              overflow: 'hidden',
              position: 'relative',
            }}
            onClick={() => onSelectPath([])} // click background deselects
          >
            <EditNode
              node={doc.root}
              path={[]}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              themeTokens={themeTokens}
              data={doc.sample as Record<string, unknown>}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDocChange={onDocChange}
            />
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
        1080×1080 • {Math.round(SCALE * 100)}% scale
      </div>
    </div>
  );
}

/**
 * TreePanel — left panel showing the node tree.
 * Click to select, expand/collapse, move up/down, add child/sibling, delete, duplicate.
 */

import { useState, useCallback } from 'react';
import type { TNode, TemplateDoc } from '@/lib/types';
import type { NodePath } from './types';
import {
  nodeLabel,
  canHaveChildren,
  makeBoxNode,
  makeTextNode,
  makeRepeatNode,
  pathEquals,
  nodeChildren,
  deleteNodeAtPath,
  moveNodeUp,
  moveNodeDown,
  insertNodeAt,
  cloneNode,
} from './types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface TreePanelProps {
  doc: TemplateDoc;
  selectedPath: NodePath;
  onSelectPath: (path: NodePath) => void;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
}

const KIND_ICONS: Record<string, string> = {
  box: '▢',
  text: 'T',
  repeat: '↻',
};

const KIND_COLORS: Record<string, string> = {
  box: 'var(--secondary)',
  text: 'var(--primary)',
  repeat: '#2e7d32',
};

interface TreeItemProps {
  node: TNode;
  path: NodePath;
  isRoot: boolean;
  selectedPath: NodePath;
  onSelectPath: (path: NodePath) => void;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
  parentChildCount: number;
}

function TreeItem({
  node,
  path,
  isRoot,
  selectedPath,
  onSelectPath,
  onDocChange,
  parentChildCount,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const isSelected = pathEquals(path, selectedPath);
  const children = nodeChildren(node);
  const hasChildren = children.length > 0;
  const canChildren = canHaveChildren(node);
  const myIndex = path.length > 0 ? path[path.length - 1] : 0;
  const depth = path.length;

  function handleSelect(e: React.MouseEvent) {
    e.stopPropagation();
    onSelectPath(path);
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((v) => !v);
  }

  function handleMoveUp(e: React.MouseEvent) {
    e.stopPropagation();
    onDocChange((doc) => ({ ...doc, root: moveNodeUp(doc.root, path) }));
    // update selection to follow the node
    if (myIndex > 0) {
      onSelectPath([...path.slice(0, -1), myIndex - 1]);
    }
  }

  function handleMoveDown(e: React.MouseEvent) {
    e.stopPropagation();
    onDocChange((doc) => ({ ...doc, root: moveNodeDown(doc.root, path) }));
    onSelectPath([...path.slice(0, -1), myIndex + 1]);
  }

  function handleAddChild(kind: 'box' | 'text' | 'repeat') {
    setAddMenuOpen(false);
    if (!canChildren) return;
    const newNode = kind === 'box' ? makeBoxNode() : kind === 'text' ? makeTextNode() : makeRepeatNode();
    onDocChange((doc) => ({
      ...doc,
      root: insertNodeAt(doc.root, path, children.length, newNode),
    }));
    setExpanded(true);
    // select newly added node
    onSelectPath([...path, children.length]);
  }

  function handleAddSibling(kind: 'box' | 'text' | 'repeat') {
    setAddMenuOpen(false);
    if (path.length === 0) return; // can't add sibling to root
    const parentPath = path.slice(0, -1);
    const insertIndex = myIndex + 1;
    const newNode = kind === 'box' ? makeBoxNode() : kind === 'text' ? makeTextNode() : makeRepeatNode();
    onDocChange((doc) => ({
      ...doc,
      root: insertNodeAt(doc.root, parentPath, insertIndex, newNode),
    }));
    onSelectPath([...parentPath, insertIndex]);
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    if (path.length === 0) return;
    const parentPath = path.slice(0, -1);
    const copy = cloneNode(node);
    onDocChange((doc) => ({
      ...doc,
      root: insertNodeAt(doc.root, parentPath, myIndex + 1, copy),
    }));
    onSelectPath([...parentPath, myIndex + 1]);
  }

  function handleDelete() {
    setDeleteOpen(false);
    if (path.length === 0) return; // don't delete root
    const parentPath = path.slice(0, -1);
    // select parent after delete
    onSelectPath(parentPath);
    onDocChange((doc) => ({ ...doc, root: deleteNodeAtPath(doc.root, path) }));
  }

  const indent = depth * 16;

  return (
    <div>
      <div
        onClick={handleSelect}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `3px 8px 3px ${8 + indent}px`,
          cursor: 'pointer',
          background: isSelected ? 'var(--primary-soft)' : 'transparent',
          borderRadius: 'var(--radius-sm)',
          borderLeft: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
          transition: 'background 0.1s',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-low)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {/* Expand/collapse toggle */}
        <span
          onClick={hasChildren ? handleToggle : undefined}
          style={{
            width: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--muted)',
            flexShrink: 0,
            cursor: hasChildren ? 'pointer' : 'default',
            opacity: hasChildren ? 1 : 0,
          }}
        >
          {expanded ? '▾' : '▸'}
        </span>

        {/* Kind icon */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: KIND_COLORS[node.kind] ?? 'var(--muted)',
          fontFamily: 'monospace',
          flexShrink: 0,
          width: 14,
          textAlign: 'center',
        }}>
          {KIND_ICONS[node.kind] ?? '?'}
        </span>

        {/* Label */}
        <span style={{
          fontSize: 12,
          color: 'var(--on-surface)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {nodeLabel(node)}
        </span>

        {/* Actions (visible on hover/selection) */}
        {isSelected && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', gap: 2, flexShrink: 0 }}
          >
            {/* Add child/sibling */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setAddMenuOpen((v) => !v); }}
                title="Add node"
                style={iconBtnStyle}
              >
                +
              </button>
              {addMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                    onClick={() => setAddMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 2px)',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    zIndex: 100,
                    minWidth: 160,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                  }}>
                    {canChildren && (
                      <>
                        <div style={menuGroupStyle}>Add child</div>
                        {(['box', 'text', 'repeat'] as const).map((k) => (
                          <button key={k} style={menuItemStyle} onClick={() => handleAddChild(k)}>
                            {KIND_ICONS[k]} {k}
                          </button>
                        ))}
                      </>
                    )}
                    {path.length > 0 && (
                      <>
                        <div style={menuGroupStyle}>Add sibling after</div>
                        {(['box', 'text', 'repeat'] as const).map((k) => (
                          <button key={`s-${k}`} style={menuItemStyle} onClick={() => handleAddSibling(k)}>
                            {KIND_ICONS[k]} {k}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Move up */}
            <button
              onClick={handleMoveUp}
              disabled={isRoot || myIndex === 0}
              title="Move up"
              style={{ ...iconBtnStyle, opacity: (isRoot || myIndex === 0) ? 0.3 : 1 }}
            >
              ↑
            </button>

            {/* Move down */}
            <button
              onClick={handleMoveDown}
              disabled={isRoot || myIndex >= parentChildCount - 1}
              title="Move down"
              style={{ ...iconBtnStyle, opacity: (isRoot || myIndex >= parentChildCount - 1) ? 0.3 : 1 }}
            >
              ↓
            </button>

            {/* Duplicate */}
            {!isRoot && (
              <button onClick={handleDuplicate} title="Duplicate" style={iconBtnStyle}>
                ⧉
              </button>
            )}

            {/* Delete */}
            {!isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                title="Delete node"
                style={{ ...iconBtnStyle, color: 'var(--error)' }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {children.map((child, i) => (
            <TreeItem
              key={i}
              node={child}
              path={[...path, i]}
              isRoot={false}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              onDocChange={onDocChange}
              parentChildCount={children.length}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete node?"
        message={
          hasChildren
            ? `This will delete the node and all ${children.length} child node(s). Continue?`
            : 'Delete this node?'
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--on-surface)',
  padding: 0,
};

const menuGroupStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  padding: '6px 10px 2px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--on-surface)',
  display: 'block',
};

export default function TreePanel({ doc, selectedPath, onSelectPath, onDocChange }: TreePanelProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 10px 6px',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        Tree
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        <TreeItem
          node={doc.root}
          path={[]}
          isRoot={true}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onDocChange={onDocChange}
          parentChildCount={1}
        />
      </div>
    </div>
  );
}

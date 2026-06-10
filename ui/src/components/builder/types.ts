/**
 * Builder-specific types and utilities.
 */

import type { TNode, TStyle } from '../../lib/types';

/** Path to a node in the tree — array of child indices */
export type NodePath = number[];

/** A node with its parent path, for tree operations */
export interface NodeRef {
  node: TNode;
  path: NodePath;
}

/** Unique stable id for each node in the edit session */
export type NodeId = string;

/** Generate a unique id */
export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Clone a TNode deeply */
export function cloneNode(node: TNode): TNode {
  return JSON.parse(JSON.stringify(node)) as TNode;
}

/** Get a node by path (returns undefined if path is invalid) */
export function getNodeAtPath(root: TNode, path: NodePath): TNode | undefined {
  let cur: TNode = root;
  for (const idx of path) {
    const children = nodeChildren(cur);
    if (!children || idx >= children.length) return undefined;
    cur = children[idx];
  }
  return cur;
}

/** Get children of a node (or empty array) */
export function nodeChildren(node: TNode): TNode[] {
  if (node.kind === 'box') return node.children ?? [];
  if (node.kind === 'repeat') return node.children;
  return [];
}

/** Can a node have children? */
export function canHaveChildren(node: TNode): boolean {
  return node.kind === 'box' || node.kind === 'repeat';
}

/** Produce a new root with a node at path replaced */
export function replaceNodeAtPath(root: TNode, path: NodePath, newNode: TNode): TNode {
  if (path.length === 0) return newNode;
  return updateChildrenAt(root, path.slice(0, -1), (children) => {
    const idx = path[path.length - 1];
    const nc = [...children];
    if (idx < nc.length) nc[idx] = newNode;
    return nc;
  });
}

/** Produce a new root with a node at path deleted */
export function deleteNodeAtPath(root: TNode, path: NodePath): TNode {
  if (path.length === 0) return root;
  return updateChildrenAt(root, path.slice(0, -1), (children) => {
    const idx = path[path.length - 1];
    const nc = [...children];
    nc.splice(idx, 1);
    return nc;
  });
}

/** Insert a node at path's parent, at given index */
export function insertNodeAt(root: TNode, parentPath: NodePath, index: number, node: TNode): TNode {
  return updateChildrenAt(root, parentPath, (children) => {
    const nc = [...children];
    nc.splice(index, 0, node);
    return nc;
  });
}

/** Move a node up within siblings */
export function moveNodeUp(root: TNode, path: NodePath): TNode {
  if (path.length === 0) return root;
  const idx = path[path.length - 1];
  if (idx === 0) return root;
  return updateChildrenAt(root, path.slice(0, -1), (children) => {
    const nc = [...children];
    [nc[idx - 1], nc[idx]] = [nc[idx], nc[idx - 1]];
    return nc;
  });
}

/** Move a node down within siblings */
export function moveNodeDown(root: TNode, path: NodePath): TNode {
  if (path.length === 0) return root;
  const idx = path[path.length - 1];
  return updateChildrenAt(root, path.slice(0, -1), (children) => {
    if (idx >= children.length - 1) return children;
    const nc = [...children];
    [nc[idx], nc[idx + 1]] = [nc[idx + 1], nc[idx]];
    return nc;
  });
}

// Internal: navigate to a parent by path and apply fn to its children array
function updateChildrenAt(
  node: TNode,
  parentPath: NodePath,
  fn: (children: TNode[]) => TNode[],
): TNode {
  if (parentPath.length === 0) {
    if (node.kind === 'box') {
      return { ...node, children: fn(node.children ?? []) };
    }
    if (node.kind === 'repeat') {
      return { ...node, children: fn(node.children) };
    }
    return node;
  }
  // Navigate deeper
  if (node.kind === 'box') {
    const children = [...(node.children ?? [])];
    const idx = parentPath[0];
    if (idx < children.length) {
      children[idx] = updateChildrenAt(children[idx], parentPath.slice(1), fn);
    }
    return { ...node, children };
  }
  if (node.kind === 'repeat') {
    const children = [...node.children];
    const idx = parentPath[0];
    if (idx < children.length) {
      children[idx] = updateChildrenAt(children[idx], parentPath.slice(1), fn);
    }
    return { ...node, children };
  }
  return node;
}

/** Create a minimal starter box node */
export function makeBoxNode(): TNode {
  return {
    kind: 'box',
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '$spacing.sm',
    },
    children: [],
  };
}

/** Create a minimal text node */
export function makeTextNode(text = 'New text'): TNode {
  return {
    kind: 'text',
    text,
    style: {
      fontSize: 24,
      color: '$color.on-surface',
    },
  };
}

/** Create a minimal repeat node */
export function makeRepeatNode(source = 'items'): TNode {
  return {
    kind: 'repeat',
    source,
    style: { display: 'flex', flexDirection: 'column', gap: '$spacing.sm' },
    children: [makeTextNode('{{item}}')],
  };
}

/** Get short display label for a node */
export function nodeLabel(node: TNode): string {
  if (node.kind === 'text') {
    const t = node.text.slice(0, 30);
    return t || '(empty)';
  }
  if (node.kind === 'repeat') return `repeat: ${node.source}`;
  return 'box';
}

/** Merge new style properties into a node's style */
export function withStyle(node: TNode, updates: TStyle): TNode {
  return { ...node, style: { ...(node.style ?? {}), ...updates } } as TNode;
}

/** Remove a key from a node's style */
export function withoutStyleKey(node: TNode, key: string): TNode {
  const style = { ...(node.style ?? {}) };
  delete style[key];
  return { ...node, style } as TNode;
}

/** Minimal root for a new template */
export function starterRoot(family: 'title' | 'body' | 'quote'): TNode {
  const mainField = family === 'title' ? 'text' : family === 'body' ? 'heading' : 'quote';
  return {
    kind: 'box',
    style: {
      width: 1080,
      height: 1080,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '$color.surface',
      padding: '$spacing.xl',
    },
    children: [
      {
        kind: 'text',
        text: `{{${mainField}}}`,
        style: { fontSize: 48, fontWeight: 700, color: '$color.on-surface' },
      },
    ],
  };
}

export function pathEquals(a: NodePath, b: NodePath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

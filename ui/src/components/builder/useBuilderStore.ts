/**
 * Central state store for the template builder.
 * All mutations go through applyChange() to support undo/redo.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TemplateDoc } from '@/lib/types';
import type { NodePath } from './types';

const UNDO_LIMIT = 50;

export type CanvasMode = 'preview' | 'edit';

export interface BuilderState {
  // Document
  doc: TemplateDoc | null;
  // Dirty tracking
  dirty: boolean;
  // Selected node path (empty = root/doc-level)
  selectedPath: NodePath;
  // Canvas mode
  canvasMode: CanvasMode;
  // Undo/redo stacks (past states)
  past: TemplateDoc[];
  future: TemplateDoc[];
}

export interface BuilderStore extends BuilderState {
  // Load a new doc (clears undo history)
  loadDoc: (doc: TemplateDoc) => void;
  // Centralized mutation — pushes to undo stack
  applyChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
  // Select a node
  setSelectedPath: (path: NodePath) => void;
  // Canvas mode
  setCanvasMode: (mode: CanvasMode) => void;
  // Undo / redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Mark clean (after save)
  markClean: () => void;
}

export function useBuilderStore(): BuilderStore {
  const [state, setState] = useState<BuilderState>({
    doc: null,
    dirty: false,
    selectedPath: [],
    canvasMode: 'preview',
    past: [],
    future: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const loadDoc = useCallback((doc: TemplateDoc) => {
    setState({
      doc,
      dirty: false,
      selectedPath: [],
      canvasMode: 'preview',
      past: [],
      future: [],
    });
  }, []);

  const applyChange = useCallback((fn: (doc: TemplateDoc) => TemplateDoc) => {
    setState((prev) => {
      if (!prev.doc) return prev;
      const newDoc = fn(prev.doc);
      const newPast = [...prev.past, prev.doc].slice(-UNDO_LIMIT);
      return {
        ...prev,
        doc: newDoc,
        dirty: true,
        past: newPast,
        future: [], // clear redo on new change
      };
    });
  }, []);

  const setSelectedPath = useCallback((path: NodePath) => {
    setState((prev) => ({ ...prev, selectedPath: path }));
  }, []);

  const setCanvasMode = useCallback((mode: CanvasMode) => {
    setState((prev) => ({ ...prev, canvasMode: mode }));
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0 || !prev.doc) return prev;
      const past = [...prev.past];
      const prevDoc = past.pop()!;
      return {
        ...prev,
        doc: prevDoc,
        dirty: true,
        past,
        future: [prev.doc, ...prev.future].slice(0, UNDO_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0 || !prev.doc) return prev;
      const future = [...prev.future];
      const nextDoc = future.shift()!;
      return {
        ...prev,
        doc: nextDoc,
        dirty: true,
        past: [...prev.past, prev.doc].slice(-UNDO_LIMIT),
        future,
      };
    });
  }, []);

  const markClean = useCallback(() => {
    setState((prev) => ({ ...prev, dirty: false }));
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  // beforeunload guard
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (stateRef.current.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return {
    ...state,
    loadDoc,
    applyChange,
    setSelectedPath,
    setCanvasMode,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    markClean,
  };
}

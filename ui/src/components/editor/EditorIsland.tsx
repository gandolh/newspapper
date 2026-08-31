/**
 * The editor — the whole product, in one island.
 *
 * `source` is the only state that matters. Everything else is derived from it:
 * the parse, the diagnostics, the compiled slides, what the inspector shows.
 * The visual panes never hold a fact the markup does not, which is what makes
 * "write it by typing" and "write it by dragging" the same feature rather than
 * two that have to be kept in step.
 *
 * Selection is a **path** — child indices from the document root — not an
 * offset, because a reformat moves every offset and a path survives it. Both
 * directions of the round trip go through that path: a caret offset becomes a
 * path via `elementPathAtOffset`, and a path becomes a source range via the
 * element's own `loc`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  format,
  isFormatted,
  lintSource,
  parse,
  WZD_RENDERABLE_NAMES,
} from '@newspapper/core/wizard';
import type { Theme } from '@newspapper/core/templates';
import { Button, Mark, Select, Skeleton, ToastProvider, useToast } from '../ui';
import { api, ApiError, sse } from '@/lib/api';
import type { Post, Settings } from '@/lib/types';
import SourcePane from './SourcePane.js';
import PreviewPane from './PreviewPane.js';
import InspectorPane from './InspectorPane.js';
import PalettePane from './PalettePane.js';
import ImagePicker from './ImagePicker.js';
import Splitter from './Splitter.js';
import { compileTraced } from './preview/compileTraced.js';
import { canContain } from './preview/slots.js';
import { zoneAt, type DragPayload, type MeasuredZone } from './dragTypes.js';
import {
  duplicateNode,
  insertComponent,
  movedPath,
  moveNode,
  nudgeNode,
  removeNode,
  setHeadField,
  setProp,
  setTextContent,
} from './edits.js';
import {
  bodyPath,
  elementAtPath,
  elementPathAtOffset,
  samePath,
  slidePaths,
  type WzdPath,
} from './paths.js';
import { starterDocument } from './starter.js';
import styles from './EditorIsland.module.css';

const PREVIEW_DEBOUNCE_MS = 200;
const AUTOSAVE_DEBOUNCE_MS = 900;
const NARROW_PX = 1180;

/** Everything the palette can offer. `Slide` has its own controls. */
const PALETTE_NAMES = WZD_RENDERABLE_NAMES.filter((name) => name !== 'Slide');

export interface EditorIslandProps {
  /**
   * The post to open. When omitted the island reads `?post=` from the URL;
   * with neither, it opens the starter document and creates the post on the
   * first save.
   */
  postId?: number | null;
  /** Markup to open with. Defaults to the starter document. */
  initialMarkup?: string;
  /** Theme to open with. Defaults to the app's configured default. */
  initialTheme?: string;
}

interface ThemeRecord {
  name: string;
  tokens: Theme | null;
}

type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

type Pane = 'source' | 'preview' | 'inspector';

interface InsertionPoint {
  parentPath: WzdPath;
  index: number;
}

function postIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('post');
  const id = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function Editor({ postId: propPostId, initialMarkup, initialTheme }: EditorIslandProps) {
  const { addToast } = useToast();

  const [source, setSource] = useState(() => initialMarkup ?? starterDocument());
  const [previewSource, setPreviewSource] = useState(source);
  const [selectedPath, setSelectedPath] = useState<WzdPath | null>(null);
  const [revealToken, setRevealToken] = useState(0);

  const [postId, setPostId] = useState<number | null>(propPostId ?? null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('clean');

  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [themeName, setThemeName] = useState(initialTheme ?? '');

  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [activeZoneKey, setActiveZoneKey] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingImage = useRef<{ path: WzdPath } | { insert: InsertionPoint } | null>(null);

  // Both on the 26px grid: 15 and 13 units.
  const [leftWidth, setLeftWidth] = useState(390);
  const [rightWidth, setRightWidth] = useState(338);
  const [narrow, setNarrow] = useState(false);
  const [pane, setPane] = useState<Pane>('preview');
  const [rendering, setRendering] = useState(false);

  const zonesRef = useRef(new Map<string, MeasuredZone[]>());
  const activeZone = useRef<MeasuredZone | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const dragRef = useRef<DragPayload | null>(null);
  dragRef.current = drag;

  // ---- derived -----------------------------------------------------------

  const parsed = useMemo(() => parse(source), [source]);
  const doc = parsed.doc;
  const broken = parsed.errors.length > 0;
  const diagnostics = useMemo(() => lintSource(source), [source]);
  const formatted = useMemo(() => isFormatted(source), [source]);

  const previewDoc = useMemo(() => parse(previewSource).doc, [previewSource]);
  const theme = useMemo(
    () => themes.find((t) => t.name === themeName)?.tokens ?? null,
    [themes, themeName],
  );
  const compiled = useMemo(
    () => (theme ? compileTraced(previewDoc, theme) : null),
    [previewDoc, theme],
  );

  const selectionRange = useMemo<[number, number] | null>(() => {
    const el = selectedPath ? elementAtPath(doc, selectedPath) : null;
    return el ? [el.loc.start.offset, el.loc.end.offset] : null;
  }, [doc, selectedPath]);

  // ---- source -> preview, on a debounce ----------------------------------

  useEffect(() => {
    if (broken) return;
    const timer = setTimeout(() => setPreviewSource(source), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source, broken]);

  // ---- edits -------------------------------------------------------------

  /** Every visual edit lands here: replace the text, then move the selection. */
  const write = useCallback((next: string, nextSelection?: WzdPath | null) => {
    if (next !== sourceRef.current) {
      sourceRef.current = next;
      setSource(next);
      setDirty(true);
      setSaveState('dirty');
    }
    if (nextSelection !== undefined) {
      setSelectedPath(nextSelection);
      setRevealToken((token) => token + 1);
    }
  }, []);

  const onSourceChange = useCallback((next: string) => {
    sourceRef.current = next;
    setSource(next);
    setDirty(true);
    setSaveState('dirty');
  }, []);

  const onCursor = useCallback(
    (offset: number) => {
      const path = elementPathAtOffset(doc, offset);
      setSelectedPath((current) => (samePath(current, path) ? current : path));
    },
    [doc],
  );

  const selectFromView = useCallback((path: WzdPath | null) => {
    setSelectedPath(path);
    setRevealToken((token) => token + 1);
  }, []);

  // ---- where a click-to-insert lands -------------------------------------

  const targetFor = useCallback(
    (component: string): InsertionPoint | null => {
      const selected = selectedPath ? elementAtPath(doc, selectedPath) : null;
      if (selected && selectedPath && canContain(selected.type, component)) {
        return { parentPath: selectedPath, index: selected.children.length };
      }
      if (selectedPath && selectedPath.length > 1) {
        const parentAt = selectedPath.slice(0, -1);
        const parent = elementAtPath(doc, parentAt);
        if (parent && canContain(parent.type, component)) {
          return {
            parentPath: parentAt,
            index: selectedPath[selectedPath.length - 1] + 1,
          };
        }
      }
      const slides = slidePaths(doc);
      for (let i = slides.length - 1; i >= 0; i -= 1) {
        const slide = elementAtPath(doc, slides[i]);
        if (slide && canContain(slide.type, component)) {
          return { parentPath: slides[i], index: slide.children.length };
        }
      }
      return null;
    },
    [doc, selectedPath],
  );

  const insertAt = useCallback(
    (at: InsertionPoint, component: string) => {
      // `<Image src>` is required, so an image is chosen before it is inserted
      // rather than landing as a lint error.
      if (component === 'Image') {
        pendingImage.current = { insert: at };
        setPickerOpen(true);
        return;
      }
      write(insertComponent(sourceRef.current, at.parentPath, at.index, component), [
        ...at.parentPath,
        at.index,
      ]);
    },
    [write],
  );

  const paletteInsert = useCallback(
    (component: string) => {
      const target = targetFor(component);
      if (target) insertAt(target, component);
    },
    [targetFor, insertAt],
  );

  const unavailable = useMemo(() => {
    const out = new Set<string>();
    if (broken) return out;
    for (const name of PALETTE_NAMES) if (!targetFor(name)) out.add(name);
    return out;
  }, [targetFor, broken]);

  // ---- drag --------------------------------------------------------------

  const onZonesMeasured = useCallback((slideKey: string, zones: MeasuredZone[]) => {
    if (zones.length) zonesRef.current.set(slideKey, zones);
    else zonesRef.current.delete(slideKey);
  }, []);

  const onDragMove = useCallback((x: number, y: number) => {
    // The ghost follows the pointer through the DOM rather than through state:
    // a re-render per pointer move would re-render every slide.
    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ghostRef.current.style.visibility = 'visible';
    }
    const all: MeasuredZone[] = [];
    for (const zones of zonesRef.current.values()) all.push(...zones);
    const hit = zoneAt(all, x, y);
    activeZone.current = hit;
    setActiveZoneKey(hit?.key ?? null);
  }, []);

  const endDrag = useCallback(() => {
    const zone = activeZone.current;
    const payload = dragRef.current;
    activeZone.current = null;
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden';
    setActiveZoneKey(null);
    setDrag(null);
    if (!zone || !payload) return;
    if (payload.kind === 'new') {
      insertAt({ parentPath: zone.slot.parentPath, index: zone.slot.index }, payload.component);
      return;
    }
    write(
      moveNode(sourceRef.current, payload.path, zone.slot.parentPath, zone.slot.index),
      movedPath(payload.path, zone.slot.parentPath, zone.slot.index),
    );
  }, [insertAt, write]);

  const gestures = useMemo(
    () => ({
      onSelect: (offset: number) => selectFromView(elementPathAtOffset(previewDoc, offset)),
      onDragStart: (offset: number) => {
        const path = elementPathAtOffset(previewDoc, offset);
        const el = path ? elementAtPath(previewDoc, path) : null;
        if (path && el) setDrag({ kind: 'move', path, component: el.type });
      },
      onDragMove,
      onDragEnd: endDrag,
    }),
    [previewDoc, onDragMove, endDrag, selectFromView],
  );

  // ---- slides ------------------------------------------------------------

  const addSlide = useCallback(
    (index: number) => {
      const at = bodyPath(doc);
      if (!at) return;
      const body = elementAtPath(doc, at);
      const slides = slidePaths(doc);
      const childIndex =
        index >= slides.length
          ? (body?.children.length ?? 0)
          : slides[index][slides[index].length - 1];
      write(insertComponent(sourceRef.current, at, childIndex, 'Slide'), [...at, childIndex]);
    },
    [doc, write],
  );

  const nudge = useCallback(
    (path: WzdPath, delta: -1 | 1) => {
      const index = path[path.length - 1];
      write(nudgeNode(sourceRef.current, path, delta), [
        ...path.slice(0, -1),
        Math.max(0, index + delta),
      ]);
    },
    [write],
  );

  // ---- theme, post, save -------------------------------------------------

  useEffect(() => {
    void (async () => {
      try {
        const list = await api<ThemeRecord[]>('/api/themes');
        setThemes(list);
        setThemeName((current) => {
          if (current && list.some((t) => t.name === current && t.tokens)) return current;
          return list.find((t) => t.tokens)?.name ?? current;
        });
      } catch {
        addToast('Could not load the themes.', 'error');
      }
    })();
  }, [addToast]);

  useEffect(() => {
    if (initialTheme) return;
    void (async () => {
      try {
        const settings = await api<Settings>('/api/settings');
        setThemeName((current) => current || settings.defaultTheme);
      } catch {
        // The theme list already provides a usable fallback.
      }
    })();
  }, [initialTheme]);

  useEffect(() => {
    if (initialMarkup !== undefined) return;
    const id = propPostId ?? postIdFromUrl();
    if (!id) return;
    setLoading(true);
    void (async () => {
      try {
        const post = await api<Post>(`/api/posts/${id}`);
        sourceRef.current = post.markup;
        setSource(post.markup);
        setPreviewSource(post.markup);
        setPostId(post.id);
        if (post.theme) setThemeName(post.theme);
        setDirty(false);
        setSaveState('clean');
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : 'Could not open that post.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [propPostId, initialMarkup, addToast]);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const body = { markup: sourceRef.current, theme: themeName };
      const saved = postId
        ? await api<Post>(`/api/posts/${postId}`, { method: 'PUT', json: body })
        : await api<Post>('/api/posts', { method: 'POST', json: body });
      if (!postId) {
        setPostId(saved.id);
        const url = new URL(window.location.href);
        url.searchParams.set('post', String(saved.id));
        window.history.replaceState({}, '', url);
      }
      setDirty(false);
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      addToast(err instanceof ApiError ? err.message : 'Could not save this post.', 'error');
    }
  }, [postId, themeName, addToast]);

  useEffect(() => {
    if (!dirty || loading) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dirty, loading, source, themeName, save]);

  const render = useCallback(async () => {
    if (!postId) return;
    setRendering(true);
    try {
      await sse(`/api/posts/${postId}/render`, {}, { onEvent: () => undefined });
      addToast('Rendered. The JPEGs are in the output folder.', 'success');
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : 'Render failed.', 'error');
    } finally {
      setRendering(false);
    }
  }, [postId, addToast]);

  // ---- layout ------------------------------------------------------------

  useEffect(() => {
    const update = (): void => setNarrow(window.innerWidth < NARROW_PX);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;

  const sourcePane = (
    <SourcePane
      source={source}
      onChange={onSourceChange}
      diagnostics={diagnostics}
      selectionRange={selectionRange}
      revealToken={revealToken}
      onCursor={onCursor}
      onFormat={() => write(format(source))}
      formatted={formatted}
    />
  );

  const previewPane = (
    <PreviewPane
      doc={previewDoc}
      slides={compiled?.slides ?? []}
      theme={theme}
      themeError={compiled?.themeError ?? null}
      stale={broken}
      selectedPath={selectedPath}
      onSelectPath={selectFromView}
      gestures={gestures}
      dragType={drag?.component ?? null}
      activeZoneKey={activeZoneKey}
      onZonesMeasured={onZonesMeasured}
      onAddSlide={addSlide}
      onRemoveSlide={(path) => write(removeNode(sourceRef.current, path), null)}
      onNudgeSlide={nudge}
    />
  );

  const inspectorPane = (
    <div className={styles.rightColumn}>
      <PalettePane
        onDragStart={(component) => setDrag({ kind: 'new', component })}
        onDragMove={onDragMove}
        onDragEnd={endDrag}
        onInsert={paletteInsert}
        unavailable={unavailable}
        dragging={drag?.kind === 'new' ? drag.component : null}
        disabled={broken}
      />
      <InspectorPane
        doc={doc}
        selectedPath={selectedPath}
        onSelectPath={selectFromView}
        onSetProp={(path, name, value) => write(setProp(sourceRef.current, path, name, value))}
        onSetText={(path, value) => write(setTextContent(sourceRef.current, path, value))}
        onSetHead={(field, value) => write(setHeadField(sourceRef.current, field, value))}
        onRemove={(path) => write(removeNode(sourceRef.current, path), null)}
        onDuplicate={(path) => write(duplicateNode(sourceRef.current, path))}
        onNudge={nudge}
        onPickImage={(path) => {
          pendingImage.current = { path };
          setPickerOpen(true);
        }}
        disabled={broken}
      />
    </div>
  );

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <h1 className={styles.title}>{doc.head['title'] || 'Untitled post'}</h1>
        <Mark tone={errorCount ? 'rubylith' : 'ink'}>
          {errorCount ? `${errorCount} ${errorCount === 1 ? 'error' : 'errors'}` : 'Compiles'}
        </Mark>
        <Mark tone={saveState === 'error' ? 'rubylith' : 'dim'}>
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'dirty'
              ? 'Unsaved'
              : saveState === 'error'
                ? 'Save failed'
                : postId
                  ? 'Saved'
                  : 'New post'}
        </Mark>
        <span className={styles.spacer} />
        <Select
          options={themes.filter((t) => t.tokens).map((t) => ({ value: t.name, label: t.name }))}
          value={themeName}
          placeholder="Theme"
          onValueChange={(value) => {
            setThemeName(value);
            setDirty(true);
            setSaveState('dirty');
          }}
          className={styles.themeSelect}
        />
        <Button variant="secondary" size="sm" onClick={() => void save()} disabled={!dirty}>
          Save
        </Button>
        <Button
          size="sm"
          loading={rendering}
          disabled={!postId || errorCount > 0 || dirty}
          onClick={() => void render()}
        >
          Render
        </Button>
      </header>

      {loading && <Skeleton height={320} />}

      {!loading && narrow && (
        <>
          <nav className={styles.tabs}>
            {(['source', 'preview', 'inspector'] as Pane[]).map((name) => (
              <Button
                key={name}
                variant={pane === name ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPane(name)}
              >
                {name[0].toUpperCase() + name.slice(1)}
              </Button>
            ))}
          </nav>
          <div className={styles.singlePane}>
            {pane === 'source' && sourcePane}
            {pane === 'preview' && previewPane}
            {pane === 'inspector' && <div className={styles.scroller}>{inspectorPane}</div>}
          </div>
        </>
      )}

      {!loading && !narrow && (
        <div className={styles.panes}>
          <div className={styles.left} style={{ width: leftWidth }}>
            {sourcePane}
          </div>
          <Splitter
            width={leftWidth}
            min={240}
            max={800}
            label="Resize the source pane"
            onResize={setLeftWidth}
          />
          <div className={styles.centre}>{previewPane}</div>
          <Splitter
            width={rightWidth}
            min={260}
            max={620}
            direction={-1}
            label="Resize the inspector pane"
            onResize={setRightWidth}
          />
          <div className={styles.right} style={{ width: rightWidth }}>
            <div className={styles.scroller}>{inspectorPane}</div>
          </div>
        </div>
      )}

      <div ref={ghostRef} className={styles.ghost} aria-hidden="true">
        {drag?.component ?? ''}
      </div>

      <ImagePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          pendingImage.current = null;
        }}
        onChoose={(ref) => {
          const pending = pendingImage.current;
          pendingImage.current = null;
          if (!pending) return;
          if ('path' in pending) {
            write(setProp(sourceRef.current, pending.path, 'src', ref));
            return;
          }
          const { parentPath, index } = pending.insert;
          write(
            insertComponent(sourceRef.current, parentPath, index, 'Image', {
              src: ref,
            }),
            [...parentPath, index],
          );
        }}
      />
    </div>
  );
}

export default function EditorIsland(props: EditorIslandProps) {
  return (
    <ToastProvider>
      <Editor {...props} />
    </ToastProvider>
  );
}

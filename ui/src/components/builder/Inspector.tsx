/**
 * Inspector — right panel for the selected node.
 * Shows doc-level info when nothing selected (path=[]).
 */

import { useState, useRef } from 'react';
import type { TNode, TemplateDoc, FieldSpec, TStyle } from '../../lib/types';
import type { NodePath } from './types';
import {
  getNodeAtPath,
  replaceNodeAtPath,
} from './types';

interface InspectorProps {
  doc: TemplateDoc;
  selectedPath: NodePath;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeData: { name: string; tokens: Record<string, any> } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '12px 12px 4px',
      borderTop: '1px solid var(--border)',
    }}>
      {title}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px' }}>
      <label style={{ fontSize: 11, color: 'var(--muted)', minWidth: 80, flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function InlineInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  style: extraStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height: 26,
        padding: '0 6px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-card)',
        color: 'var(--on-surface)',
        fontSize: 12,
        ...extraStyle,
      }}
    />
  );
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height: 26,
        padding: '0 4px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-card)',
        color: 'var(--on-surface)',
        fontSize: 12,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Color input with theme swatches
// ---------------------------------------------------------------------------

function ColorInput({
  value,
  onChange,
  themeColors,
}: {
  value: string;
  onChange: (v: string) => void;
  themeColors: Record<string, string>;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const resolved = value.startsWith('$color.')
    ? themeColors[value.slice(7)] ?? value
    : value;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          style={{
            width: 24,
            height: 24,
            background: resolved,
            border: '1px solid var(--border)',
            borderRadius: 3,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#hex or $color.key"
          style={{
            flex: 1,
            height: 26,
            padding: '0 6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-card)',
            color: 'var(--on-surface)',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        />
      </div>
      {value.startsWith('$') && (
        <div style={{ fontSize: 10, color: 'var(--muted)', paddingTop: 2 }}>
          → {resolved}
        </div>
      )}
      {showPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowPicker(false)} />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            width: 220,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(themeColors).map(([k, v]) => (
                <button
                  key={k}
                  title={`$color.${k} = ${v}`}
                  onClick={() => { onChange(`$color.${k}`); setShowPicker(false); }}
                  style={{
                    width: 24,
                    height: 24,
                    background: v,
                    border: `2px solid ${value === `$color.${k}` ? 'var(--primary)' : 'transparent'}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <input
                type="color"
                value={resolved.startsWith('#') ? resolved : '#000000'}
                onChange={(e) => { onChange(e.target.value); }}
                style={{ width: '100%', height: 30, border: 'none', cursor: 'pointer', borderRadius: 3 }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spacing input with token chips
// ---------------------------------------------------------------------------

function SpacingInput({
  value,
  onChange,
  themeSpacing,
}: {
  value: string;
  onChange: (v: string) => void;
  themeSpacing: Record<string, string>;
}) {
  const resolved = value.startsWith('$spacing.')
    ? themeSpacing[value.slice(9)] ?? value
    : value;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
        {Object.entries(themeSpacing).map(([k, v]) => (
          <button
            key={k}
            onClick={() => onChange(`$spacing.${k}`)}
            title={v}
            style={{
              height: 18,
              padding: '0 5px',
              border: `1px solid ${value === `$spacing.${k}` ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 3,
              background: value === `$spacing.${k}` ? '#ffdbd1' : 'transparent',
              fontSize: 10,
              cursor: 'pointer',
              color: value === `$spacing.${k}` ? 'var(--primary)' : 'var(--muted)',
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 16px or $spacing.md"
        style={{
          width: '100%',
          height: 26,
          padding: '0 6px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-card)',
          color: 'var(--on-surface)',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      />
      {value.startsWith('$') && (
        <div style={{ fontSize: 10, color: 'var(--muted)', paddingTop: 2 }}>→ {resolved}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style editor
// ---------------------------------------------------------------------------

interface StyleEditorProps {
  style: TStyle;
  onChange: (style: TStyle) => void;
  nodeKind: TNode['kind'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeData: { name: string; tokens: Record<string, any> } | null;
  fieldKeys: string[];
}

function StyleEditor({ style, onChange, nodeKind, themeData, fieldKeys }: StyleEditorProps) {
  const [rawOpen, setRawOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rawError, setRawError] = useState('');

  const themeColors = themeData?.tokens['colors'] ?? themeData?.tokens['color'] ?? {};
  const themeSpacing = themeData?.tokens['spacing'] ?? {};
  const themeTypography = themeData?.tokens['typography'] ?? {};
  const themeRounded = themeData?.tokens['rounded'] ?? {};

  function set(key: string, value: string | number) {
    if (value === '' || value === undefined) {
      const newStyle = { ...style };
      delete newStyle[key];
      onChange(newStyle);
    } else {
      onChange({ ...style, [key]: value });
    }
  }

  function get(key: string, def = ''): string {
    const v = style[key];
    if (v === undefined || v === null) return def;
    return String(v);
  }

  function applyRaw() {
    try {
      const parsed = JSON.parse(rawText) as TStyle;
      onChange(parsed);
      setRawOpen(false);
      setRawError('');
    } catch {
      setRawError('Invalid JSON');
    }
  }

  return (
    <div>
      {/* Layout */}
      <SectionHeader title="Layout" />
      <Row label="display">
        <InlineSelect
          value={get('display', '')}
          options={[
            { value: '', label: '—' },
            { value: 'flex', label: 'flex' },
            { value: 'block', label: 'block' },
            { value: 'grid', label: 'grid' },
            { value: 'inline', label: 'inline' },
            { value: 'none', label: 'none' },
          ]}
          onChange={(v) => set('display', v)}
        />
      </Row>
      {get('display') === 'flex' && (
        <>
          <Row label="flexDir">
            <InlineSelect
              value={get('flexDirection', '')}
              options={[
                { value: '', label: '—' },
                { value: 'row', label: 'row' },
                { value: 'column', label: 'column' },
                { value: 'row-reverse', label: 'row-reverse' },
                { value: 'column-reverse', label: 'col-reverse' },
              ]}
              onChange={(v) => set('flexDirection', v)}
            />
          </Row>
          <Row label="justify">
            <InlineSelect
              value={get('justifyContent', '')}
              options={[
                { value: '', label: '—' },
                { value: 'flex-start', label: 'flex-start' },
                { value: 'flex-end', label: 'flex-end' },
                { value: 'center', label: 'center' },
                { value: 'space-between', label: 'space-between' },
                { value: 'space-around', label: 'space-around' },
              ]}
              onChange={(v) => set('justifyContent', v)}
            />
          </Row>
          <Row label="align">
            <InlineSelect
              value={get('alignItems', '')}
              options={[
                { value: '', label: '—' },
                { value: 'stretch', label: 'stretch' },
                { value: 'flex-start', label: 'flex-start' },
                { value: 'flex-end', label: 'flex-end' },
                { value: 'center', label: 'center' },
                { value: 'baseline', label: 'baseline' },
              ]}
              onChange={(v) => set('alignItems', v)}
            />
          </Row>
          <Row label="gap">
            <SpacingInput
              value={get('gap', '')}
              onChange={(v) => set('gap', v)}
              themeSpacing={themeSpacing}
            />
          </Row>
          <Row label="flex">
            <InlineInput value={get('flex', '')} onChange={(v) => set('flex', v)} placeholder="e.g. 1" />
          </Row>
        </>
      )}
      <Row label="position">
        <InlineSelect
          value={get('position', '')}
          options={[
            { value: '', label: '—' },
            { value: 'static', label: 'static' },
            { value: 'relative', label: 'relative' },
            { value: 'absolute', label: 'absolute' },
          ]}
          onChange={(v) => set('position', v)}
        />
      </Row>
      {get('position') === 'absolute' && (
        <>
          <Row label="top"><InlineInput value={get('top', '')} onChange={(v) => set('top', v)} /></Row>
          <Row label="right"><InlineInput value={get('right', '')} onChange={(v) => set('right', v)} /></Row>
          <Row label="bottom"><InlineInput value={get('bottom', '')} onChange={(v) => set('bottom', v)} /></Row>
          <Row label="left"><InlineInput value={get('left', '')} onChange={(v) => set('left', v)} /></Row>
        </>
      )}
      <Row label="width"><InlineInput value={get('width', '')} onChange={(v) => set('width', v)} placeholder="px or %" /></Row>
      <Row label="height"><InlineInput value={get('height', '')} onChange={(v) => set('height', v)} placeholder="px or %" /></Row>
      <Row label="padding">
        <SpacingInput value={get('padding', '')} onChange={(v) => set('padding', v)} themeSpacing={themeSpacing} />
      </Row>
      <Row label="margin">
        <SpacingInput value={get('margin', '')} onChange={(v) => set('margin', v)} themeSpacing={themeSpacing} />
      </Row>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <Row label="background">
        <ColorInput
          value={get('backgroundColor', '')}
          onChange={(v) => set('backgroundColor', v)}
          themeColors={themeColors}
        />
      </Row>
      <Row label="color">
        <ColorInput
          value={get('color', '')}
          onChange={(v) => set('color', v)}
          themeColors={themeColors}
        />
      </Row>
      <Row label="radius">
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
            {Object.entries(themeRounded as Record<string, string>).map(([k, v]) => (
              <button
                key={k}
                onClick={() => set('borderRadius', `$rounded.${k}`)}
                title={v}
                style={{
                  height: 18,
                  padding: '0 5px',
                  border: `1px solid ${get('borderRadius') === `$rounded.${k}` ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 3,
                  background: get('borderRadius') === `$rounded.${k}` ? '#ffdbd1' : 'transparent',
                  fontSize: 10,
                  cursor: 'pointer',
                  color: get('borderRadius') === `$rounded.${k}` ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <InlineInput value={get('borderRadius', '')} onChange={(v) => set('borderRadius', v)} placeholder="px or token" />
        </div>
      </Row>
      <Row label="border">
        <InlineInput value={get('border', '')} onChange={(v) => set('border', v)} placeholder="1px solid #ccc" />
      </Row>
      <Row label="shadow">
        <InlineInput value={get('boxShadow', '')} onChange={(v) => set('boxShadow', v)} placeholder="0 2px 8px rgba(0,0,0,.1)" />
      </Row>
      <Row label="opacity">
        <InlineInput value={get('opacity', '')} onChange={(v) => set('opacity', v)} type="number" placeholder="0–1" />
      </Row>

      {/* Typography (for text nodes) */}
      {nodeKind === 'text' && (
        <>
          <SectionHeader title="Typography" />
          <Row label="preset">
            <InlineSelect
              value={get('typography', '')}
              options={[
                { value: '', label: '—' },
                ...Object.keys(themeTypography).map((k) => ({ value: k, label: k })),
              ]}
              onChange={(v) => set('typography', v)}
            />
          </Row>
          <Row label="fontSize">
            <InlineInput value={get('fontSize', '')} onChange={(v) => set('fontSize', isNaN(Number(v)) ? v : Number(v))} placeholder="px" />
          </Row>
          <Row label="fontWeight">
            <InlineSelect
              value={get('fontWeight', '')}
              options={[
                { value: '', label: '—' },
                { value: '400', label: '400' },
                { value: '500', label: '500' },
                { value: '600', label: '600' },
                { value: '700', label: '700' },
                { value: '800', label: '800' },
                { value: '900', label: '900' },
              ]}
              onChange={(v) => set('fontWeight', v ? Number(v) : '')}
            />
          </Row>
          <Row label="lineHeight">
            <InlineInput value={get('lineHeight', '')} onChange={(v) => set('lineHeight', isNaN(Number(v)) ? v : Number(v))} placeholder="e.g. 1.4" />
          </Row>
          <Row label="letterSpacing">
            <InlineInput value={get('letterSpacing', '')} onChange={(v) => set('letterSpacing', v)} placeholder="e.g. -0.02em" />
          </Row>
          <Row label="textAlign">
            <InlineSelect
              value={get('textAlign', '')}
              options={[
                { value: '', label: '—' },
                { value: 'left', label: 'left' },
                { value: 'center', label: 'center' },
                { value: 'right', label: 'right' },
              ]}
              onChange={(v) => set('textAlign', v)}
            />
          </Row>
          <Row label="transform">
            <InlineSelect
              value={get('textTransform', '')}
              options={[
                { value: '', label: '—' },
                { value: 'uppercase', label: 'uppercase' },
                { value: 'lowercase', label: 'lowercase' },
                { value: 'capitalize', label: 'capitalize' },
              ]}
              onChange={(v) => set('textTransform', v)}
            />
          </Row>
        </>
      )}

      {/* Raw escape hatch */}
      <div style={{ padding: '8px 12px' }}>
        <button
          onClick={() => {
            setRawText(JSON.stringify(style, null, 2));
            setRawError('');
            setRawOpen((v) => !v);
          }}
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {rawOpen ? '▾' : '▸'} All styles (JSON)
        </button>
        {rawOpen && (
          <div style={{ marginTop: 6 }}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: 6,
                border: `1px solid ${rawError ? 'var(--error)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-card)',
                resize: 'vertical',
                color: 'var(--on-surface)',
              }}
            />
            {rawError && <p style={{ fontSize: 11, color: 'var(--error)' }}>{rawError}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                onClick={applyRaw}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
              <button
                onClick={() => setRawOpen(false)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node inspector
// ---------------------------------------------------------------------------

interface NodeInspectorProps {
  node: TNode;
  path: NodePath;
  doc: TemplateDoc;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeData: { name: string; tokens: Record<string, any> } | null;
}

function isInsideRepeat(root: TNode, path: NodePath): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur.kind === 'repeat') return true;
    const ch: TNode[] = (cur.kind === 'box' || cur.kind === 'repeat') ? (cur.children ?? []) : [];
    cur = ch[path[i]] ?? cur;
  }
  return cur.kind === 'repeat';
}

function NodeInspector({ node, path, doc, onDocChange, themeData }: NodeInspectorProps) {
  const listFields = doc.fields.filter((f) => f.kind === 'list');
  const allFieldKeys = doc.fields.map((f) => f.key);
  const inRepeat = isInsideRepeat(doc.root, path);
  const builtins = ['_index', '_total', '_date', ...(inRepeat ? ['item', 'i'] : [])];

  function updateNode(fn: (n: TNode) => TNode) {
    onDocChange((d) => ({
      ...d,
      root: replaceNodeAtPath(d.root, path, fn(getNodeAtPath(d.root, path)!)),
    }));
  }

  function insertBinding(binding: string, textRef: React.RefObject<HTMLTextAreaElement | null>) {
    if (!textRef.current || node.kind !== 'text') return;
    const el = textRef.current;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = (node as { text: string }).text;
    const newText = current.slice(0, start) + `{{${binding}}}` + current.slice(end);
    updateNode((n) => n.kind === 'text' ? { ...n, text: newText } : n);
    // restore cursor
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + binding.length + 4;
    }, 0);
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      {/* Node kind header */}
      <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {node.kind} node
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
          [{path.join('.')}]
        </span>
      </div>

      {/* Text node controls */}
      {node.kind === 'text' && (
        <div style={{ padding: '0 12px 8px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)', display: 'block', marginBottom: 4 }}>
            Text
          </label>
          <textarea
            ref={textareaRef}
            value={node.text}
            onChange={(e) => updateNode((n) => n.kind === 'text' ? { ...n, text: e.target.value } : n)}
            rows={3}
            style={{
              width: '100%',
              padding: 6,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)',
              color: 'var(--on-surface)',
              fontSize: 12,
              resize: 'vertical',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', flexBasis: '100%' }}>Insert binding:</span>
            {[...allFieldKeys, ...builtins].map((key) => (
              <button
                key={key}
                onClick={() => insertBinding(key, textareaRef)}
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  background: 'var(--surface-low)',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  color: 'var(--on-surface)',
                }}
              >
                {'{{' + key + '}}'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Repeat node controls */}
      {node.kind === 'repeat' && (
        <div style={{ padding: '0 12px 8px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Source (list field)
          </label>
          <select
            value={node.source}
            onChange={(e) => updateNode((n) => n.kind === 'repeat' ? { ...n, source: e.target.value } : n)}
            style={{
              width: '100%',
              height: 26,
              padding: '0 4px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)',
              fontSize: 12,
            }}
          >
            {listFields.map((f) => (
              <option key={f.key} value={f.key}>{f.key} ({f.label})</option>
            ))}
            {/* allow free entry */}
            <option value={node.source}>{node.source}</option>
          </select>
        </div>
      )}

      {/* Style editor */}
      <StyleEditor
        style={node.style ?? {}}
        onChange={(s) => updateNode((n) => ({ ...n, style: s } as TNode))}
        nodeKind={node.kind}
        themeData={themeData}
        fieldKeys={allFieldKeys}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Doc-level inspector
// ---------------------------------------------------------------------------

interface DocInspectorProps {
  doc: TemplateDoc;
  onDocChange: (fn: (doc: TemplateDoc) => TemplateDoc) => void;
}

function DocInspector({ doc, onDocChange }: DocInspectorProps) {
  function updateField(i: number, updates: Partial<FieldSpec>) {
    onDocChange((d) => {
      const fields = [...d.fields];
      fields[i] = { ...fields[i], ...updates };
      return { ...d, fields };
    });
  }

  function addField() {
    onDocChange((d) => ({
      ...d,
      fields: [
        ...d.fields,
        { key: `field${d.fields.length + 1}`, label: 'New field', kind: 'text', required: false },
      ],
    }));
  }

  function removeField(i: number) {
    onDocChange((d) => {
      const fields = [...d.fields];
      fields.splice(i, 1);
      return { ...d, fields };
    });
  }

  return (
    <div>
      <div style={{ padding: '10px 12px 6px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Document
        </span>
      </div>

      <SectionHeader title="Info" />
      <Row label="id">
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)' }}>{doc.id}</span>
      </Row>
      <Row label="theme">
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)' }}>{doc.theme}</span>
      </Row>
      <Row label="family">
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)' }}>{doc.family}</span>
      </Row>
      <Row label="name">
        <InlineInput
          value={doc.name}
          onChange={(v) => onDocChange((d) => ({ ...d, name: v }))}
          placeholder="Display name"
        />
      </Row>

      <SectionHeader title="Fields" />
      <div style={{ padding: '0 12px' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Field keys must match the bindings used in text nodes (e.g. {String.fromCharCode(123,123)}key{String.fromCharCode(125,125)}).
        </p>
        {doc.fields.map((f, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 8,
              marginBottom: 8,
              background: 'var(--surface-low)',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
                placeholder="key"
                style={{
                  flex: 1,
                  height: 24,
                  padding: '0 4px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: 'var(--surface-card)',
                  color: 'var(--on-surface)',
                }}
              />
              <input
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="Label"
                style={{
                  flex: 1,
                  height: 24,
                  padding: '0 4px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  fontSize: 11,
                  background: 'var(--surface-card)',
                  color: 'var(--on-surface)',
                }}
              />
              <button
                onClick={() => removeField(i)}
                style={{
                  width: 22,
                  height: 24,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--error)',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={f.kind}
                onChange={(e) => updateField(i, { kind: e.target.value as FieldSpec['kind'] })}
                style={{
                  flex: 1,
                  height: 24,
                  padding: '0 4px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  fontSize: 11,
                  background: 'var(--surface-card)',
                  color: 'var(--on-surface)',
                }}
              >
                <option value="text">text</option>
                <option value="textarea">textarea</option>
                <option value="list">list</option>
                <option value="pair">pair</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateField(i, { required: e.target.checked })}
                />
                required
              </label>
            </div>
          </div>
        ))}
        <button
          onClick={addField}
          style={{
            width: '100%',
            height: 28,
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          + Add field
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inspector
// ---------------------------------------------------------------------------

export default function Inspector({ doc, selectedPath, onDocChange, themeData }: InspectorProps) {
  const node = selectedPath.length > 0 ? getNodeAtPath(doc.root, selectedPath) : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 12px 6px',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        Inspector
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {node && selectedPath.length > 0 ? (
          <NodeInspector
            node={node}
            path={selectedPath}
            doc={doc}
            onDocChange={onDocChange}
            themeData={themeData}
          />
        ) : (
          <DocInspector doc={doc} onDocChange={onDocChange} />
        )}
      </div>
    </div>
  );
}

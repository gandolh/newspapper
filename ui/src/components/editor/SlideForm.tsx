/**
 * SlideForm — renders editable fields for a single slide based on its FieldSpec[].
 */
import type { SlideBlock, FieldSpec } from '../../lib/types';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface SlideFormProps {
  slide: SlideBlock;
  fields: FieldSpec[];
  onChange: (updated: SlideBlock) => void;
}

export default function SlideForm({ slide, fields, onChange }: SlideFormProps) {
  const data = slide as Record<string, unknown>;

  function setField(key: string, value: unknown) {
    onChange({ ...data, [key]: value } as unknown as SlideBlock);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map((field) => {
        const val = data[field.key];

        if (field.kind === 'text') {
          return (
            <Input
              key={field.key}
              label={field.label}
              value={typeof val === 'string' ? val : ''}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.label}
            />
          );
        }

        if (field.kind === 'textarea') {
          return (
            <Textarea
              key={field.key}
              label={field.label}
              value={typeof val === 'string' ? val : ''}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.label}
              rows={4}
            />
          );
        }

        if (field.kind === 'list') {
          const items: string[] = Array.isArray(val) ? (val as string[]) : ['', '', ''];

          return (
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block' }}>
                {field.label}
              </label>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = e.target.value;
                      setField(field.key, next);
                    }}
                    placeholder={`Item ${idx + 1}`}
                    style={{ flex: 1 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      type="button"
                      aria-label="Move item up"
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx === 0) return;
                        const next = [...items];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setField(field.key, next);
                      }}
                      style={iconBtnStyle}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move item down"
                      disabled={idx === items.length - 1}
                      onClick={() => {
                        if (idx === items.length - 1) return;
                        const next = [...items];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        setField(field.key, next);
                      }}
                      style={iconBtnStyle}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove item"
                    disabled={items.length <= 1}
                    onClick={() => {
                      if (items.length <= 1) return;
                      setField(field.key, items.filter((_, i) => i !== idx));
                    }}
                    style={{ ...iconBtnStyle, color: 'var(--error)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setField(field.key, [...items, ''])}
                style={{
                  alignSelf: 'flex-start', fontSize: 12, fontWeight: 500,
                  color: 'var(--primary)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px 0',
                }}
              >
                + Add item
              </button>
            </div>
          );
        }

        if (field.kind === 'pair') {
          const pair = (typeof val === 'object' && val !== null)
            ? val as { label: string; body: string }
            : { label: '', body: '' };

          return (
            <fieldset
              key={field.key}
              style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <legend style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', padding: '0 4px' }}>
                {field.label}
              </legend>
              <Input
                label="Label"
                value={pair.label}
                onChange={(e) => setField(field.key, { ...pair, label: e.target.value })}
                placeholder="Label"
              />
              <Textarea
                label="Body"
                value={pair.body}
                onChange={(e) => setField(field.key, { ...pair, body: e.target.value })}
                placeholder="Body text"
                rows={3}
              />
            </fieldset>
          );
        }

        return null;
      })}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 22, height: 22, border: '1px solid var(--border)',
  borderRadius: 4, background: 'var(--surface-card)', cursor: 'pointer',
  fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--on-surface)', padding: 0,
  lineHeight: 1,
};

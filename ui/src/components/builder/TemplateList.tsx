/**
 * TemplateList — left-column list of templates for the current theme.
 * Replaces the old top-bar dropdown: every template is visible and the active
 * one is clearly highlighted (matching the tree's selection treatment).
 */

import type { TemplateDoc } from '@/lib/types';
import Spinner from '../ui/Spinner';

interface TemplateListProps {
  templates: TemplateDoc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

const FAMILY_COLORS: Record<string, string> = {
  title: 'var(--primary)',
  body: 'var(--secondary)',
  quote: '#2e7d32',
};

export default function TemplateList({ templates, selectedId, onSelect, loading }: TemplateListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          padding: '8px 10px 6px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        Templates
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6, minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
            <Spinner size={18} color="var(--primary)" />
          </div>
        ) : templates.length === 0 ? (
          <div style={{ padding: '8px 6px', color: 'var(--muted)', fontSize: 12 }}>No templates.</div>
        ) : (
          templates.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                aria-current={active ? 'true' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 8px',
                  marginBottom: 2,
                  border: 'none',
                  borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? 'var(--primary-soft)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--on-surface)',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-low)';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span
                  title={t.family}
                  style={{
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 5px',
                    borderRadius: 4,
                    color: '#fff',
                    background: FAMILY_COLORS[t.family] ?? 'var(--muted)',
                  }}
                >
                  {t.family.slice(0, 3)}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

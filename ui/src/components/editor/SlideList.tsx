/**
 * SlideList — vertical list of slide cards with thumbnails, reorder, delete, and add.
 */
import { useState } from 'react';
import type { SlideBlock, TemplateDoc } from '@/lib/types';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import PreviewFrame from './PreviewFrame';
import { slideSnippet, slideToData, buildNewSlide } from './slideUtils';

const MAX_SLIDES = 8;

interface SlideListProps {
  slides: SlideBlock[];
  selectedIndex: number;
  theme: string;
  templates: TemplateDoc[];
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onDelete: (index: number) => void;
  onAdd: (slide: SlideBlock, afterIndex: number) => void;
  onToast: (msg: string, variant?: 'success' | 'error' | 'info') => void;
}

function familyVariant(badge: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted' {
  if (badge === 'title') return 'primary';
  if (badge === 'body') return 'success';
  if (badge === 'quote') return 'warning';
  return 'default';
}

export default function SlideList({
  slides,
  selectedIndex,
  theme,
  templates,
  onSelect,
  onReorder,
  onDelete,
  onAdd,
  onToast,
}: SlideListProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addFamily, setAddFamily] = useState<'title' | 'body' | 'quote' | null>(null);

  // Group templates by family for the Add modal
  const byFamily: Record<string, TemplateDoc[]> = {};
  for (const t of templates) {
    (byFamily[t.family] ??= []).push(t);
  }
  const families = ['title', 'body', 'quote'].filter((f) => byFamily[f]?.length);

  function handleDelete() {
    if (deleteIndex === null) return;
    if (slides.length <= 2) {
      onToast('Must have at least 2 slides', 'error');
      setDeleteIndex(null);
      return;
    }
    onDelete(deleteIndex);
    setDeleteIndex(null);
  }

  function handleAddSlide(template: TemplateDoc) {
    if (slides.length >= MAX_SLIDES) {
      onToast('Maximum 8 slides allowed', 'error');
      setAddOpen(false);
      setAddFamily(null);
      return;
    }
    const newSlide = buildNewSlide(template.id, template.fields);
    onAdd(newSlide, selectedIndex);
    setAddOpen(false);
    setAddFamily(null);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      height: '100%', overflow: 'hidden',
    }}>
      {/* Scrollable list */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
        padding: '8px 8px 0',
      }}>
        {slides.map((slide, idx) => {
          const isSelected = idx === selectedIndex;
          const snippet = slideSnippet(slide);
          const data = slideToData(slide);
          const templateId = slide.variant;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelect(idx)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px',
                borderRadius: 'var(--radius)',
                border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                background: isSelected ? '#fff5f2' : 'var(--surface-card)',
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s',
                minHeight: 64,
              }}
            >
              {/* Thumbnail */}
              <div style={{ flexShrink: 0 }}>
                <PreviewFrame
                  templateId={templateId}
                  data={data}
                  theme={theme}
                  index={idx + 1}
                  total={slides.length}
                  scale={0.065}
                  debounce={1500}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                    {idx + 1}
                  </span>
                  <Badge variant={familyVariant(slide.type)} style={{ fontSize: 10, padding: '1px 5px' }}>
                    {slide.type}
                  </Badge>
                </div>
                <p style={{
                  fontSize: 11, color: 'var(--on-surface)', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  margin: 0,
                }}>
                  {snippet || <span style={{ color: 'var(--muted)' }}>empty</span>}
                </p>
              </div>

              {/* Controls */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button" aria-label="Move slide up"
                  disabled={idx === 0}
                  onClick={() => onReorder(idx, idx - 1)}
                  style={controlBtnStyle}
                >↑</button>
                <button
                  type="button" aria-label="Move slide down"
                  disabled={idx === slides.length - 1}
                  onClick={() => onReorder(idx, idx + 1)}
                  style={controlBtnStyle}
                >↓</button>
                <button
                  type="button" aria-label="Delete slide"
                  onClick={() => {
                    if (slides.length <= 2) {
                      onToast('Must have at least 2 slides', 'error');
                      return;
                    }
                    setDeleteIndex(idx);
                  }}
                  style={{ ...controlBtnStyle, color: 'var(--error)' }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add slide button */}
      <div style={{ padding: '8px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => {
            if (slides.length >= MAX_SLIDES) {
              onToast('Maximum 8 slides allowed', 'error');
              return;
            }
            setAddOpen(true);
          }}
          style={{
            width: '100%', padding: '8px 0', border: '1.5px dashed var(--outline-variant)',
            borderRadius: 'var(--radius)', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--primary)',
            transition: 'background 0.12s',
          }}
        >
          + Add slide
        </button>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        onConfirm={handleDelete}
        title="Delete slide?"
        message="Remove this slide from the post. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Add slide modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddFamily(null); }}
        title="Add slide"
        width={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!addFamily ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                Choose a slide family:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {families.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAddFamily(f as 'title' | 'body' | 'quote')}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: 'var(--radius)',
                      border: '1.5px solid var(--border)', background: 'var(--surface-card)',
                      cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      color: 'var(--on-surface)', transition: 'border-color 0.12s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAddFamily(null)}
                style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Choose a <strong>{addFamily}</strong> variant:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(byFamily[addFamily] ?? []).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleAddSlide(tmpl)}
                    style={{
                      padding: '10px 14px', borderRadius: 'var(--radius)',
                      border: '1.5px solid var(--border)', background: 'var(--surface-card)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{tmpl.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{tmpl.id}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" size="sm" onClick={() => { setAddOpen(false); setAddFamily(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  width: 20, height: 20, border: '1px solid var(--border)',
  borderRadius: 3, background: 'var(--surface)', cursor: 'pointer',
  fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--on-surface)', padding: 0, lineHeight: 1,
};

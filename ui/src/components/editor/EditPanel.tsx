/**
 * EditPanel — right panel: field form, variant switcher, AI actions.
 */
import { useRef, useState } from 'react';
import type { SlideBlock, TemplateDoc } from '@/lib/types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import ConfirmDialog from '../ui/ConfirmDialog';
import SlideForm from './SlideForm';
import { api } from '@/lib/api';
import {
  canInstantSwitch,
  switchVariantInstant,
  titleMainToStatement,
} from './slideUtils';

interface EditPanelProps {
  slide: SlideBlock;
  slideIndex: number;
  templates: TemplateDoc[];
  onChange: (updated: SlideBlock) => void;
  onUndo: (prev: SlideBlock) => void;
  onToast: (msg: string, variant?: 'success' | 'error' | 'info', action?: () => void, actionLabel?: string) => void;
}

const AI_ACTIONS = [
  { action: 'shorter', label: 'Make it shorter' },
  { action: 'punchier', label: 'Make it punchier' },
  { action: 'regenerate', label: 'Regenerate from articles' },
] as const;

type AiAction = (typeof AI_ACTIONS)[number]['action'];

function groupByFamily(templates: TemplateDoc[]) {
  const groups: { family: string; templates: TemplateDoc[] }[] = [];
  const seen = new Map<string, TemplateDoc[]>();
  for (const t of templates) {
    if (!seen.has(t.family)) {
      seen.set(t.family, []);
      groups.push({ family: t.family, templates: seen.get(t.family)! });
    }
    seen.get(t.family)!.push(t);
  }
  return groups;
}

export default function EditPanel({
  slide,
  slideIndex,
  templates,
  onChange,
  onUndo,
  onToast,
}: EditPanelProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  // Variant switch confirm states
  const [dropKickerOpen, setDropKickerOpen] = useState(false);
  const [crossFamilyOpen, setCrossFamilyOpen] = useState(false);
  const [pendingVariant, setPendingVariant] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  const currentTemplate = templates.find((t) => t.id === slide.variant);
  const fields = currentTemplate?.fields ?? [];

  const variantOptions = templates.map((t) => ({
    value: t.id,
    label: `${t.name} (${t.family})`,
  }));

  // Group for optgroup rendering — we use a flat Select for simplicity
  const groups = groupByFamily(templates);
  // Build flat options with family headers indicated via label prefix
  const groupedOptions = groups.flatMap((g) =>
    g.templates.map((t) => ({
      value: t.id,
      label: `[${g.family}] ${t.name}`,
    })),
  );

  function handleVariantChange(toVariant: string) {
    if (toVariant === slide.variant) return;
    const fromVariant = slide.variant;
    const fromFamily = fromVariant.split('-')[0];
    const toFamily = toVariant.split('-')[0];

    // Same family, instant-compatible
    if (canInstantSwitch(fromVariant, toVariant)) {
      onChange(switchVariantInstant(slide, toVariant));
      return;
    }

    // title-main → title-statement/question: check kicker
    if (fromVariant === 'title-main' && (toVariant === 'title-statement' || toVariant === 'title-question')) {
      const s = slide as Record<string, unknown>;
      const kicker = s['kicker'];
      if (typeof kicker === 'string' && kicker.trim()) {
        setPendingVariant(toVariant);
        setDropKickerOpen(true);
        return;
      }
      onChange(switchVariantInstant(slide, toVariant));
      return;
    }

    // title-statement/question → title-main: safe
    if ((fromVariant === 'title-statement' || fromVariant === 'title-question') && toVariant === 'title-main') {
      onChange(switchVariantInstant(slide, toVariant));
      return;
    }

    // Same family otherwise — just switch
    if (fromFamily === toFamily) {
      onChange(switchVariantInstant(slide, toVariant));
      return;
    }

    // Cross-family: confirm + remap
    setPendingVariant(toVariant);
    setCrossFamilyOpen(true);
  }

  async function handleCrossFamilyConfirm() {
    if (!pendingVariant) return;
    setCrossFamilyOpen(false);
    const prev = slide;
    setAiPending(true);
    try {
      const result = await api<{ slide: SlideBlock }>('/api/slide-ai', {
        method: 'POST',
        json: { slide, action: 'remap', targetVariant: pendingVariant },
      });
      onChange(result.slide);
      onToast('Variant remapped by AI', 'success', () => { onChange(prev); onUndo(prev); }, 'Undo');
    } catch (err) {
      onToast(`Remap failed: ${(err as Error).message}`, 'error');
    } finally {
      setAiPending(false);
      setPendingVariant(null);
    }
  }

  async function handleAiAction(action: AiAction) {
    setAiOpen(false);
    const prev = slide;
    setAiPending(true);
    try {
      const result = await api<{ slide: SlideBlock }>('/api/slide-ai', {
        method: 'POST',
        json: { slide, action },
      });
      onChange(result.slide);
      onToast(`AI: ${action} applied`, 'success', () => { onChange(prev); onUndo(prev); }, 'Undo');
    } catch (err) {
      onToast(`AI action failed: ${(err as Error).message}`, 'error');
    } finally {
      setAiPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'hidden' }}>
      {/* Slide header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
            SLIDE {slideIndex + 1}
          </span>
          <Badge variant={slide.type === 'title' ? 'primary' : slide.type === 'body' ? 'success' : 'warning'}>
            {slide.type}
          </Badge>
        </div>

        {/* AI button */}
        <div style={{ position: 'relative' }} ref={aiMenuRef}>
          <Button
            variant="secondary"
            size="sm"
            loading={aiPending}
            onClick={() => !aiPending && setAiOpen((o) => !o)}
          >
            ✦ AI
          </Button>
          {aiOpen && (
            <>
              {/* Click-away backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setAiOpen(false)}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                background: 'var(--surface-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: 180, zIndex: 20, overflow: 'hidden',
              }}>
                {aiPending ? (
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spinner size={14} color="var(--primary)" />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Working…</span>
                  </div>
                ) : (
                  AI_ACTIONS.map(({ action, label }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleAiAction(action)}
                      style={{
                        width: '100%', padding: '10px 16px', textAlign: 'left',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: 'var(--on-surface)',
                        transition: 'background 0.1s',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-low)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      {label}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Variant switcher */}
      <div style={{ flexShrink: 0 }}>
        <Select
          label="Variant"
          options={groupedOptions}
          value={slide.variant}
          onChange={(e) => handleVariantChange(e.target.value)}
        />
      </div>

      {/* Field form */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <SlideForm
          slide={slide}
          fields={fields}
          onChange={onChange}
        />
      </div>

      {/* Confirm: drop kicker */}
      <ConfirmDialog
        open={dropKickerOpen}
        onClose={() => { setDropKickerOpen(false); setPendingVariant(null); }}
        onConfirm={() => {
          if (pendingVariant) {
            const switched = titleMainToStatement(slide);
            const s = switched as Record<string, unknown>;
            onChange({ ...s, variant: pendingVariant } as unknown as SlideBlock);
          }
          setDropKickerOpen(false);
          setPendingVariant(null);
        }}
        title="Drop kicker?"
        message="Switching from title-main to this variant will remove the kicker field. Continue?"
        confirmLabel="Switch anyway"
        cancelLabel="Keep kicker"
        variant="danger"
      />

      {/* Confirm: cross-family remap */}
      <ConfirmDialog
        open={crossFamilyOpen}
        onClose={() => { setCrossFamilyOpen(false); setPendingVariant(null); }}
        onConfirm={handleCrossFamilyConfirm}
        title="AI will convert content"
        message="Switching to a different slide family will use AI to remap the content. This may take a moment."
        confirmLabel="Convert with AI"
        cancelLabel="Cancel"
        variant="primary"
        loading={aiPending}
      />
    </div>
  );
}


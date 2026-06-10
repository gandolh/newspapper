import type { Theme } from '../theme.js';
import { Footer, SlideFrame } from './frame.js';

export function BodyText({
  theme,
  index,
  total,
  heading,
  body,
}: {
  theme: Theme;
  index: number;
  total: number;
  heading: string;
  body: string;
}) {
  return (
    <SlideFrame theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: theme.colors['on-surface'],
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.45,
            color: theme.colors['on-surface-variant'],
          }}
        >
          {body}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function BodyList({
  theme,
  index,
  total,
  heading,
  items,
}: {
  theme: Theme;
  index: number;
  total: number;
  heading: string;
  items: string[];
}) {
  return (
    <SlideFrame theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: theme.colors['on-surface'],
          }}
        >
          {heading}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: theme.spacing.sm,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Inter',
                  fontWeight: 800,
                  fontSize: 28,
                  color: theme.colors.primary,
                  minWidth: 48,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: theme.colors['on-surface'],
                  flex: 1,
                }}
              >
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function BodyComparison({
  theme,
  index,
  total,
  heading,
  left,
  right,
}: {
  theme: Theme;
  index: number;
  total: number;
  heading: string;
  left: { label: string; body: string };
  right: { label: string; body: string };
}) {
  const column = (label: string, body: string, color: string, onColor: string) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: color,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: onColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 26,
          lineHeight: 1.4,
          color: onColor,
        }}
      >
        {body}
      </div>
    </div>
  );

  return (
    <SlideFrame theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 48,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: theme.colors['on-surface'],
          }}
        >
          {heading}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: theme.spacing.sm, flex: 1 }}>
          {column(left.label, left.body, theme.colors['surface-container'], theme.colors['on-surface'])}
          {column(right.label, right.body, theme.colors.primary, theme.colors['on-primary'])}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

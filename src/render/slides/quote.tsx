import type { Theme } from '../theme.js';
import { Footer, SlideFrame } from './frame.js';

interface QuoteProps {
  theme: Theme;
  index: number;
  total: number;
  quote: string;
  attribution: string;
}

export function QuoteClassic({ theme, index, total, quote, attribution }: QuoteProps) {
  return (
    <SlideFrame theme={theme}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 48,
            lineHeight: 1.3,
            color: theme.colors['on-surface'],
            textAlign: 'center',
          }}
        >
          {`“${quote}”`}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: theme.colors['on-surface-variant'],
          }}
        >
          — {attribution}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function QuotePullout({ theme, index, total, quote, attribution }: QuoteProps) {
  return (
    <SlideFrame theme={theme} background={theme.colors['surface-container']}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: theme.spacing.sm }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 260,
            lineHeight: 0.8,
            color: theme.colors.primary,
            marginBottom: -40,
          }}
        >
          “
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: 56,
            lineHeight: 1.2,
            color: theme.colors['on-surface'],
          }}
        >
          {quote}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: theme.spacing.md,
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 22,
            color: theme.colors['on-surface-variant'],
          }}
        >
          — {attribution}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function QuoteReaction({ theme, index, total, quote, attribution }: QuoteProps) {
  return (
    <SlideFrame theme={theme} background={theme.colors.primary}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: theme.spacing.md }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: 64,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: theme.colors['on-primary'],
          }}
        >
          {`“${quote}”`}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: theme.colors['on-primary'],
            opacity: 0.85,
          }}
        >
          — {attribution}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          paddingTop: theme.spacing.md,
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: 700,
          color: theme.colors['on-primary'],
          opacity: 0.7,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex' }}>Newspapper</span>
        <span style={{ display: 'flex' }}>{`${index} / ${total}`}</span>
      </div>
    </SlideFrame>
  );
}

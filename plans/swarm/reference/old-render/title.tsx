import type { Theme } from '../theme.js';
import { Footer, SlideFrame } from './frame.js';

interface TitleProps {
  theme: Theme;
  index: number;
  total: number;
  text: string;
  kicker?: string;
}

export function TitleMain({ theme, index, total, text, kicker }: TitleProps) {
  return (
    <SlideFrame theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        {kicker ? (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors['on-primary'],
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              borderRadius: 8,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            color: theme.colors['on-surface'],
          }}
        >
          {text}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function TitleStatement({ theme, index, total, text }: TitleProps) {
  return (
    <SlideFrame theme={theme} background={theme.colors['surface-container-high']}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          fontFamily: 'Inter',
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: theme.colors['on-surface'],
        }}
      >
        {text}
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

export function TitleQuestion({ theme, index, total, text }: TitleProps) {
  return (
    <SlideFrame theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: theme.spacing.md }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: 220,
            lineHeight: 1,
            color: theme.colors.primary,
          }}
        >
          ?
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: 64,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: theme.colors['on-surface'],
          }}
        >
          {text}
        </div>
      </div>
      <Footer theme={theme} index={index} total={total} />
    </SlideFrame>
  );
}

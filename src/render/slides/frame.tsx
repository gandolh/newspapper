import type { ReactNode } from 'react';
import type { Theme } from '../theme.js';

export const SLIDE_SIZE = 1080;

export function SlideFrame({
  theme,
  children,
  background,
}: {
  theme: Theme;
  children: ReactNode;
  background?: string;
}) {
  return (
    <div
      style={{
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: background ?? theme.colors['surface'],
        color: theme.colors['on-surface'],
        padding: theme.spacing['container-margin'],
        fontFamily: 'Inter',
      }}
    >
      {children}
    </div>
  );
}

export function Footer({ theme, index, total }: { theme: Theme; index: number; total: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: theme.spacing.md,
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 700,
        color: theme.colors['on-surface-variant'],
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      }}
    >
      <span style={{ display: 'flex' }}>Newspapper</span>
      <span style={{ display: 'flex' }}>{`${index} / ${total}`}</span>
    </div>
  );
}

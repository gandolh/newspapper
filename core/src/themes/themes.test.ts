import { describe, it, expect } from 'vitest';
import { loadTheme, listThemes } from './index.js';

describe('loadTheme', () => {
  it('loads warm-industrial', () => {
    const theme = loadTheme('warm-industrial');
    expect(theme.name).toBe('Warm Industrial');
    expect(theme.colors['primary']).toBe('#a2391a');
    expect(theme.typography['display']).toBeDefined();
    expect(theme.spacing['md']).toBe('24px');
    expect(theme.rounded['md']).toBe('0.75rem');
  });

  it('throws for unknown theme', () => {
    expect(() => loadTheme('nonexistent-theme')).toThrow('Theme not found');
  });
});

describe('listThemes', () => {
  it('returns at least warm-industrial', () => {
    const themes = listThemes();
    expect(themes).toContain('warm-industrial');
  });

  it('returns sorted list', () => {
    const themes = listThemes();
    const sorted = [...themes].sort();
    expect(themes).toEqual(sorted);
  });
});

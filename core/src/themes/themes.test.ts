import { describe, it, expect } from 'vitest';
import { loadTheme, listThemes } from './index.js';

describe('loadTheme', () => {
  it('loads warm-industrial-1', () => {
    const theme = loadTheme('warm-industrial-1');
    expect(theme.name).toBe('Warm Industrial 1');
    expect(theme.colors['primary']).toBe('#a2391a');
    expect(theme.typography['display']).toBeDefined();
    expect(theme.spacing['md']).toBe('24px');
    expect(theme.rounded['md']).toBe('0.75rem');
  });

  it('throws for the retired unsuffixed name', () => {
    expect(() => loadTheme('warm-industrial')).toThrow('Theme not found');
  });

  it('throws for unknown theme', () => {
    expect(() => loadTheme('nonexistent-theme')).toThrow('Theme not found');
  });
});

describe('listThemes', () => {
  it('returns exactly the three-strong warm-industrial family', () => {
    expect(listThemes()).toEqual(['warm-industrial-1', 'warm-industrial-2', 'warm-industrial-3']);
  });

  it('returns sorted list', () => {
    const themes = listThemes();
    const sorted = [...themes].sort();
    expect(themes).toEqual(sorted);
  });

  it('varies only colour across the family', () => {
    const [first, ...rest] = listThemes().map(loadTheme);
    for (const theme of rest) {
      expect(theme.typography).toEqual(first.typography);
      expect(theme.spacing).toEqual(first.spacing);
      expect(theme.rounded).toEqual(first.rounded);
      expect(theme.shapes).toEqual(first.shapes);
      expect(theme.colors['primary']).not.toBe(first.colors['primary']);
    }
  });
});

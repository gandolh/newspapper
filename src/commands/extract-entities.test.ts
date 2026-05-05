import { describe, it, expect } from 'vitest';
import { formatSingleArticleSummary, formatAggregateSummary } from './extract-entities.js';

describe('formatSingleArticleSummary', () => {
  it('prints all entity categories with counts', () => {
    const result = formatSingleArticleSummary('Biden climate plan', {
      people: ['Biden', 'Kerry', 'Buttigieg'],
      places: ['United States', 'Washington'],
      organizations: ['White House'],
      events: ['climate summit announced'],
    });
    expect(result).toContain('Biden climate plan');
    expect(result).toContain('People (3)');
    expect(result).toContain('Places (2)');
    expect(result).toContain('Organizations (1)');
    expect(result).toContain('Events (1)');
    expect(result).toContain('Biden, Kerry, Buttigieg');
  });

  it('shows up to 5 values per category', () => {
    const result = formatSingleArticleSummary('title', {
      people: ['A', 'B', 'C', 'D', 'E', 'F'],
      places: [],
      organizations: [],
      events: [],
    });
    expect(result).toContain('People (6)');
    expect(result).toContain('A, B, C, D, E');
    expect(result).not.toContain('F');
  });

  it('omits categories with zero entities', () => {
    const result = formatSingleArticleSummary('title', {
      people: ['Biden'],
      places: [],
      organizations: [],
      events: [],
    });
    expect(result).not.toContain('Places');
    expect(result).not.toContain('Organizations');
    expect(result).not.toContain('Events');
  });
});

describe('formatAggregateSummary', () => {
  it('returns unique counts across all entity records', () => {
    const records = [
      { people: ['Biden', 'Kerry'], places: ['Washington'], organizations: [], events: [] },
      { people: ['Biden', 'Pelosi'], places: ['New York'], organizations: ['Congress'], events: [] },
    ];
    const result = formatAggregateSummary(records);
    expect(result).toContain('Unique people: 3');
    expect(result).toContain('Unique places: 2');
    expect(result).toContain('Unique organizations: 1');
    expect(result).toContain('Unique events: 0');
  });

  it('handles empty input', () => {
    const result = formatAggregateSummary([]);
    expect(result).toContain('Unique people: 0');
  });
});

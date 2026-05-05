import { describe, it, expect } from 'vitest';
import { extractKeywords, renderClusterHeader, renderEntitiesAndKeywords } from './group.js';

describe('extractKeywords', () => {
  it('returns entity terms first then title-derived terms, capped at 10', () => {
    const articles = [
      { id: '1', title: 'Biden announces new climate policy initiative', body: '' },
      { id: '2', title: 'White House unveils climate legislation plan', body: '' },
      { id: '3', title: 'Biden climate plan details emerge from Washington', body: '' },
    ];
    const commonEntities = {
      people: ['Biden'],
      places: ['Washington', 'United States'],
      organizations: [],
      events: [],
    };
    const keywords = extractKeywords(articles, commonEntities);
    expect(keywords).toContain('Biden');
    expect(keywords).toContain('Washington');
    expect(keywords).toContain('climate');
    expect(keywords.length).toBeLessThanOrEqual(10);
    // entity terms come before title terms
    expect(keywords.indexOf('Biden')).toBeLessThan(keywords.indexOf('climate'));
  });

  it('deduplicates entity terms and title terms case-insensitively', () => {
    const articles = [
      { id: '1', title: 'biden wins election', body: '' },
    ];
    const commonEntities = { people: ['Biden'], places: [], organizations: [], events: [] };
    const keywords = extractKeywords(articles, commonEntities);
    const bidenCount = keywords.filter(k => k.toLowerCase() === 'biden').length;
    expect(bidenCount).toBe(1);
  });

  it('caps at 10 keywords', () => {
    const articles = [
      { id: '1', title: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda', body: '' },
    ];
    const commonEntities = { people: [], places: [], organizations: [], events: [] };
    const keywords = extractKeywords(articles, commonEntities);
    expect(keywords.length).toBeLessThanOrEqual(10);
  });

  it('handles empty entities and titles gracefully', () => {
    const articles = [{ id: '1', title: '', body: '' }];
    const commonEntities = { people: [], places: [], organizations: [], events: [] };
    expect(extractKeywords(articles, commonEntities)).toEqual([]);
  });
});

describe('renderClusterHeader', () => {
  it('returns a formatted header string', () => {
    const out = renderClusterHeader(3, 10, 4);
    expect(out).toContain('Group 3/10');
    expect(out).toContain('4 articles');
  });
});

describe('renderEntitiesAndKeywords', () => {
  it('returns empty string when no entities and no keywords', () => {
    const entities = { people: [], places: [], organizations: [], events: [] };
    const result = renderEntitiesAndKeywords(entities, []);
    expect(result).toBe('');
  });

  it('includes people and places when present', () => {
    const entities = { people: ['Biden'], places: ['Washington'], organizations: [], events: [] };
    const result = renderEntitiesAndKeywords(entities, ['climate', 'policy']);
    expect(result).toContain('Biden');
    expect(result).toContain('Washington');
    expect(result).toContain('climate, policy');
  });
});

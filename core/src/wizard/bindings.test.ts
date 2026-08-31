import { describe, it, expect } from 'vitest';
import { findBindings, isBindableField, resolveBindings, unresolvedBindings } from './bindings.js';

describe('findBindings', () => {
  it('finds each one with its range', () => {
    expect(findBindings('on {date} at {title}')).toEqual([
      { name: 'date', raw: '{date}', start: 3, end: 9 },
      { name: 'title', raw: '{title}', start: 13, end: 20 },
    ]);
  });

  it('finds nothing in text with no braces', () => {
    expect(findBindings('plain words')).toEqual([]);
  });
});

describe('isBindableField', () => {
  it('is the head fields and nothing else', () => {
    expect(isBindableField('date')).toBe(true);
    expect(isBindableField('hashtags')).toBe(true);
    expect(isBindableField('author')).toBe(false);
  });
});

describe('resolveBindings', () => {
  it('substitutes what the head declares', () => {
    expect(resolveBindings('{date} — {title}', { date: '2026-08-27', title: 'Daily' })).toBe(
      '2026-08-27 — Daily',
    );
  });

  it('leaves an unresolved binding visible rather than blanking it', () => {
    expect(resolveBindings('{date}', { title: 'Daily' })).toBe('{date}');
    expect(resolveBindings('{author}', { title: 'Daily' })).toBe('{author}');
  });
});

describe('unresolvedBindings', () => {
  it('distinguishes an unknown field from an empty one', () => {
    expect(unresolvedBindings('{author} {date}', { title: 'T' }).map((b) => b.problem)).toEqual([
      'unknown-field',
      'empty-field',
    ]);
  });
});

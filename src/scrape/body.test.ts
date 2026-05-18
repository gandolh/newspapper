import { describe, expect, it } from 'vitest';
import { stripHtml } from './body.js';

describe('stripHtml', () => {
  it('drops script and style blocks', () => {
    const out = stripHtml('<style>x{color:red}</style><p>Hello</p><script>alert(1)</script>');
    expect(out).toBe('Hello');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('<p>Tom &amp; Jerry &#39;quoted&#39;</p>')).toBe("Tom & Jerry 'quoted'");
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>a\n\n\nb     c</p>')).toBe('a b c');
  });

  it('strips comments', () => {
    expect(stripHtml('<!-- bad --><p>good</p>')).toBe('good');
  });
});

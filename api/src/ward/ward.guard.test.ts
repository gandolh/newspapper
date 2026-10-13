import { describe, it, expect } from 'vitest';
import { isGuardedPath, requiresSession } from './ward.guard.js';

/**
 * The route-pattern decision, without a server. The end-to-end cases (a real
 * request, a real 401) are in `auth.test.ts`; these pin the function itself.
 */
describe('requiresSession', () => {
  it('guards the API, the render output and uploads', () => {
    expect(requiresSession('/api/posts', '/api/posts')).toBe(true);
    expect(requiresSession('/output/1999-01-01-1/slide-01.jpg', '/output/*')).toBe(true);
    expect(requiresSession('/uploads/abc', '/uploads/:ref')).toBe(true);
  });

  it('leaves health, the UI and the fonts public', () => {
    expect(requiresSession('/api/health', '/api/health')).toBe(false);
    expect(requiresSession('/assets/fonts/Inter.ttf', '/assets/fonts/*')).toBe(false);
    expect(requiresSession('/index.html', '/index.html')).toBe(false);
    expect(requiresSession('/posts', undefined)).toBe(false);
  });

  it('decides from the matched pattern when the raw URL hides the prefix (brief 77)', () => {
    // find-my-way decodes `%61` before matching, so the pattern says /api/posts.
    expect(isGuardedPath('/%61pi/posts')).toBe(false);
    expect(requiresSession('/%61pi/posts', '/api/posts')).toBe(true);
  });

  it('guards an unmatched /api/ URL too, so a 404 does not leak which paths exist', () => {
    expect(requiresSession('/api/nothing-here?x=1', undefined)).toBe(true);
  });
});

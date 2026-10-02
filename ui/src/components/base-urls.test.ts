import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '@newspapper/core/wizard';

/**
 * Brief 78. Served at `/newspapper/`, every URL the *browser* resolves must
 * carry the base, and three call sites built theirs by hand: post links went to
 * the origin root, and post thumbnails, picker thumbnails and the preview
 * canvas's images all 404ed. `BASE` is read from `import.meta.env.BASE_URL` once
 * at module load, so each test stubs it and re-imports the modules fresh.
 */
async function load(base: string) {
  vi.stubEnv('BASE_URL', base);
  vi.resetModules();
  const posts = await import('./posts/PostsIsland');
  const picker = await import('./editor/ImagePicker');
  const editor = await import('./editor/EditorIsland');
  const traced = await import('./editor/preview/compileTraced');
  return { ...posts, ...picker, ...editor, ...traced };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('browser-resolved URLs under /newspapper/', () => {
  it('post links stay inside the app', async () => {
    const { postHref } = await load('/newspapper/');
    expect(postHref(123)).toBe('/newspapper/?post=123');
  });

  it('upload thumbnails and the preview canvas carry the base', async () => {
    const { uploadThumbSrc, previewCompileOptions } = await load('/newspapper/');
    expect(uploadThumbSrc('/uploads/abc123')).toBe('/newspapper/uploads/abc123');
    expect(previewCompileOptions()).toEqual({ uploadBaseUrl: '/newspapper/uploads' });
  });

  it('a preview <Image> compiles to a prefixed background URL', async () => {
    const { compileTraced, previewCompileOptions } = await load('/newspapper/');
    const { readFileSync } = await import('node:fs');
    const theme = JSON.parse(
      readFileSync(
        new URL('../../../assets/design-systems/warm-industrial-1.json', import.meta.url),
        'utf8',
      ),
    );
    const doc = parse(
      '<head><title>T</title></head><body><Slide><Image src="abc123.jpg" /></Slide></body>',
    ).doc;
    const html = JSON.stringify(compileTraced(doc, theme, previewCompileOptions()));
    expect(html).toContain('/newspapper/uploads/abc123.jpg');
    expect(html).not.toMatch(/url\(['"]?\/uploads\//);
  });

  it('dev, at the root, is unchanged', async () => {
    const { postHref, uploadThumbSrc, previewCompileOptions } = await load('/');
    expect(postHref(7)).toBe('/?post=7');
    expect(uploadThumbSrc('/uploads/x')).toBe('/uploads/x');
    expect(previewCompileOptions()).toEqual({ uploadBaseUrl: '/uploads' });
  });
});

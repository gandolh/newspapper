/**
 * Brief 105, step 7. The sanitizer is the only line of defence between a
 * feed's HTML and the app's origin (there is no CSP), so it is tested as one.
 *
 * **It runs in real Chromium, not in happy-dom**, and that is the finding of
 * writing it. Under happy-dom 20.14.5, `DOMPurify.isSupported` is `true` and
 * DOMPurify still does not work: happy-dom's `NodeIterator` is a `TreeWalker`
 * that does not adjust when the node it stands on is removed, so DOMPurify's
 * walk ends at the first element it removes. `<p>a</p><script>…</script><p
 * onclick>` came back with the script and the handler intact. A suite of
 * one-dangerous-element-per-input cases would have passed there anyway — the
 * dangerous node is the first one removed, so it goes — while real feed HTML,
 * where the bad node is the fifth, would not have been sanitized at all. It
 * mangles clean markup too: `<p>a</p><p>b</p>` comes back as `a<p>b</p>`. So
 * `isSupported` alone is not "it ran"; a walk that continues past a removal
 * is, and every multi-node case below checks that.
 *
 * The module under test is the shipped one: `sanitize.ts` and the pinned
 * DOMPurify are bundled by Vite and loaded into a Chromium page, through the
 * same Chromium guard the render tests use — skipped with a banner locally if
 * Chromium is missing, a failure under `CI`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import type { WindowLike } from 'dompurify';
import { build, type Rollup } from 'vite';
import { getBrowser } from '../../../../core/src/render/browser.js';
import {
  probeChromium,
  type ChromiumGuard,
} from '../../../../core/src/render/test-support/chromium.js';
import { createItemSanitizer, safeHttpUrl, textParagraphs } from './sanitize';

type SanitizeModule = typeof import('./sanitize');

/** Playwright's `Page`, taken from core's `getBrowser` rather than imported
 * from `playwright`, which `ui/package.json` does not declare: a type that
 * resolves only through hoisting is lesson #8 of green-because-nothing-ran. */
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>['newPage']>>;

interface Sanitized {
  html: string;
  /** Every element in the output, in document order, with its attributes. */
  elements: Array<{ tag: string; attrs: Record<string, string> }>;
}

let chromium: ChromiumGuard;
let page: Page | null = null;

/**
 * `sanitize.ts` + DOMPurify as one IIFE exposing `window.ReaderSanitize`.
 *
 * `configFile: false` means none of ui/vite.config.ts applies — no `@/` alias
 * among it — so `sanitize.ts` must import nothing from `@/lib/*`, or this
 * bundle stops building and the suite fails rather than testing.
 */
async function bundle(): Promise<string> {
  const result = (await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL('./sanitize.ts', import.meta.url)),
        formats: ['iife'],
        name: 'ReaderSanitize',
        fileName: 'reader-sanitize',
      },
    },
  })) as Rollup.RollupOutput[];
  const chunk = result[0]!.output.find((o): o is Rollup.OutputChunk => o.type === 'chunk');
  if (!chunk) throw new Error('vite produced no chunk for sanitize.ts');
  return chunk.code;
}

beforeAll(async () => {
  chromium = await probeChromium('sanitize.test', 'that feed HTML is sanitized in a real DOM');
  if (!chromium.available) return;
  const code = await bundle();
  page = await (await getBrowser()).newPage();
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addScriptTag({ content: code });
}, 60_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

/** Sanitize in the page, then parse the output there — inside a `<template>`,
 * so nothing in it loads or runs — and report what it contains. */
async function clean(input: string): Promise<Sanitized> {
  return page!.evaluate((html) => {
    const mod = (window as unknown as { ReaderSanitize: SanitizeModule }).ReaderSanitize;
    const out = mod.sanitizeItemHtml(html);
    if (out === null) throw new Error('the sanitizer did not run');
    const template = document.createElement('template');
    template.innerHTML = out;
    return {
      html: out,
      elements: [...template.content.querySelectorAll('*')].map((el) => ({
        tag: el.localName,
        attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
      })),
    };
  }, input);
}

const tags = (s: Sanitized): string[] => s.elements.map((e) => e.tag);
const only = (s: Sanitized, tag: string) => s.elements.filter((e) => e.tag === tag);

describe('sanitizing feed HTML in Chromium', () => {
  it('runs: DOMPurify is supported here, and its walk continues past a removal', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const supported = await page!.evaluate(
      () =>
        (
          window as unknown as { ReaderSanitize: SanitizeModule }
        ).ReaderSanitize.createItemSanitizer(window).isSupported,
    );
    expect(supported).toBe(true);
    // The control: the handler sits AFTER a removed node. An unsupported
    // DOMPurify returns this untouched, and a broken walk stops at the script.
    const out = await clean('<p>a</p><script>x()</script><p onclick="y()">b</p><style>z</style>');
    expect(out.html).toBe('<p>a</p><p>b</p>');
  });

  it('drops <script> and its contents', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean('<p>a</p><script>alert(1)</script><p>b</p><script src="//x"></script>');
    expect(tags(out)).toEqual(['p', 'p']);
    expect(out.html).not.toMatch(/script|alert/i);
  });

  it('drops event handlers such as onerror and onclick', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p onclick="alert(1)">t</p><img src="https://x.test/a.png" onerror="alert(2)" alt="a">' +
        '<a href="https://x.test/" onmouseover="alert(3)">l</a>',
    );
    expect(tags(out)).toEqual(['p', 'img', 'a']);
    for (const el of out.elements) {
      for (const name of Object.keys(el.attrs)) expect(name).not.toMatch(/^on/i);
    }
    expect(out.html).not.toContain('alert');
  });

  it('drops javascript: hrefs, in any case and with embedded whitespace', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>x</p><a href="javascript:alert(1)">a</a><a href=" JaVaScRiPt:alert(1)">b</a>' +
        '<a href="java&#x09;script:alert(1)">c</a>',
    );
    const links = only(out, 'a');
    expect(links).toHaveLength(3);
    for (const a of links) expect(a.attrs).toEqual({});
    expect(out.html).not.toMatch(/javascript/i);
  });

  it('drops data: hrefs, and data: images', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>x</p><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">a</a>' +
        '<img src="data:image/svg+xml,%3Csvg onload=alert(1)%3E" alt="x">',
    );
    expect(tags(out)).toEqual(['p', 'a']);
    expect(only(out, 'a')[0]!.attrs).toEqual({});
    expect(out.html).not.toContain('data:');
  });

  it('drops <iframe> and what is in it', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>a</p><iframe src="https://evil.test/" srcdoc="<script>alert(1)</script>"></iframe><p>b</p>',
    );
    expect(tags(out)).toEqual(['p', 'p']);
    expect(out.html).not.toMatch(/iframe|evil\.test|alert/i);
  });

  it('drops <svg onload> and everything inside it', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>a</p><svg onload="alert(1)"><script>alert(2)</script><circle r="4"></circle></svg><p>b</p>',
    );
    expect(out.html).toBe('<p>a</p><p>b</p>');
  });

  it('drops <style> and its rules, and every style attribute', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>a</p><style>body{display:none}</style><p style="position:fixed;inset:0">b</p>',
    );
    expect(out.html).toBe('<p>a</p><p>b</p>');
  });

  it('drops <form> and its controls, keeping the words', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>a</p><form action="https://evil.test/" method="post"><label>Name</label>' +
        '<input name="n"><button formaction="https://evil.test/">Go</button></form><p>b</p>',
    );
    expect(tags(out)).toEqual(['p', 'p']);
    expect(out.html).not.toMatch(/form|input|button|action/i);
    expect(out.html).toContain('Name');
  });

  it('keeps only the per-tag attributes', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p class="x" id="y" title="t" data-a="1" aria-label="l">t</p>' +
        '<a href="https://ok.test/" title="t" class="c" download ping="https://evil.test/">l</a>' +
        '<img src="https://ok.test/i.png" alt="a" width="9" srcset="https://evil.test/ 2x">',
    );
    expect(out.elements).toEqual([
      { tag: 'p', attrs: {} },
      {
        tag: 'a',
        attrs: { href: 'https://ok.test/', target: '_blank', rel: 'noopener noreferrer' },
      },
      {
        tag: 'img',
        attrs: {
          src: 'https://ok.test/i.png',
          alt: 'a',
          loading: 'lazy',
          referrerpolicy: 'no-referrer',
        },
      },
    ]);
  });

  it('refuses relative URLs, which would resolve against this app', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean('<p>x</p><a href="/api/sources">a</a><img src="pic.png" alt="p">');
    expect(tags(out)).toEqual(['p', 'a']);
    expect(only(out, 'a')[0]!.attrs).toEqual({});
  });

  it('unwraps tags outside the allowlist but keeps their text', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<div><span>kept</span></div><table><tr><td>cell</td></tr></table><p>after</p>',
    );
    expect(tags(out)).toEqual(['p']);
    expect(out.html).toBe('keptcell<p>after</p>');
  });

  it('keeps the allowed formatting as it was', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const html =
      '<h2>H</h2><p><strong>b</strong> <em>i</em> <code>c</code></p><ul><li>one</li></ul>' +
      '<ol><li>two</li></ol><blockquote><p>q</p></blockquote><pre><code>x = 1</code></pre>' +
      '<figure><figcaption>cap</figcaption></figure><hr>';
    expect((await clean(html)).html).toBe(html);
  });

  it('forces target and rel on every link, overriding the feed', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>x</p><a href="https://ok.test/p" target="_self" rel="opener">l</a><a href="//ok.test/q">m</a>',
    );
    expect(only(out, 'a').map((a) => a.attrs)).toEqual([
      { href: 'https://ok.test/p', target: '_blank', rel: 'noopener noreferrer' },
      { href: 'https://ok.test/q', target: '_blank', rel: 'noopener noreferrer' },
    ]);
  });

  it('forces lazy loading and no referrer on every image', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const out = await clean(
      '<p>x</p><figure><img src="http://ok.test/i.png" alt="pic" loading="eager" ' +
        'referrerpolicy="unsafe-url"><figcaption>c</figcaption></figure>',
    );
    expect(only(out, 'img')[0]!.attrs).toEqual({
      src: 'http://ok.test/i.png',
      alt: 'pic',
      loading: 'lazy',
      referrerpolicy: 'no-referrer',
    });
  });
});

describe('when DOMPurify cannot run', () => {
  // This file runs in Node, where there is no DOM: exactly the environment in
  // which DOMPurify reports unsupported and would return its input untouched.
  it('returns null rather than the input, so the caller renders text', () => {
    const sanitizer = createItemSanitizer({} as unknown as WindowLike);
    expect(sanitizer.isSupported).toBe(false);
    expect(sanitizer.sanitize('<img src=x onerror=alert(1)>')).toBeNull();
    expect(createItemSanitizer(undefined).sanitize('<p>x</p>')).toBeNull();
  });

  it('splits the plain text into paragraphs', () => {
    expect(textParagraphs('one\n\n two  words \n\n\nthree')).toEqual(['one', 'two words', 'three']);
    expect(textParagraphs('   ')).toEqual([]);
  });
});

describe('safeHttpUrl', () => {
  it('admits absolute http(s) only, reading protocol-relative as https', () => {
    expect(safeHttpUrl('https://a.test/')).toBe('https://a.test/');
    expect(safeHttpUrl(' HTTP://a.test/ ')).toBe('HTTP://a.test/');
    expect(safeHttpUrl('//a.test/x')).toBe('https://a.test/x');
    expect(safeHttpUrl('mailto:a@b.test')).toBeNull();
    expect(safeHttpUrl('ftp://a.test/')).toBeNull();
    expect(safeHttpUrl('#top')).toBeNull();
    expect(safeHttpUrl('/relative')).toBeNull();
  });
});

/**
 * The typeface guard.
 *
 * A rendered slide must be set in Inter. It was not: `renderTemplate` injects
 * `@font-face` rules pointing at `http://localhost:3001/assets/fonts/...`, and
 * `page.setContent` gives the render document an *opaque* origin (`Origin:
 * null`). Font fetches are always CORS-mode, the API's CORS allowlist is the UI
 * origin only, so Chromium fetched the TTF (200, full bytes — which is why the
 * font looked "served") and then discarded it: `FontFace.status === 'error'`.
 * Every slide silently fell back to the default sans.
 *
 * These tests render through the real interpreter output against a font origin
 * with the *same* CORS posture as the API, and assert the pixels are not the
 * fallback's.
 *
 * If Chromium is missing these are reported SKIPPED (never passed), a banner
 * goes to stderr, and in CI they fail outright — "green because nothing ran" is
 * the failure mode this file exists to avoid.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';

import { renderTemplate } from '../templates/interpreter.js';
import type { Theme, TNode } from '../types.js';
import { htmlToJpeg } from './screenshot.js';
import { getBrowser, closeBrowser } from './browser.js';
import { FONT_DIR, localFontPath } from './fonts.js';

// ---------------------------------------------------------------------------
// Browser availability — probed once, loudly
// ---------------------------------------------------------------------------

let browserAvailable = true;
let browserError = '';
try {
  const browser = await getBrowser();
  if (!browser.isConnected()) throw new Error('browser not connected');
} catch (err) {
  browserAvailable = false;
  browserError = (err as Error).message.split('\n')[0] ?? String(err);
}

const SKIP_NOTE = 'Chromium unavailable — the typeface guard did NOT verify anything';

function unavailableBanner(): string {
  const rule = '='.repeat(78);
  return [
    '',
    rule,
    '[fonts.test] CHROMIUM UNAVAILABLE — THE TYPEFACE GUARD DID NOT RUN.',
    '[fonts.test] Nothing here verified that rendered slides are set in Inter.',
    '[fonts.test] Run `npx playwright install chromium` before trusting this run.',
    `[fonts.test] cause: ${browserError}`,
    rule,
    '',
  ].join('\n');
}

/**
 * Skip loudly, or — in CI, where Chromium is meant to be installed — not at all:
 * a guard that cannot run is a failure there, not a quiet pass.
 */
function browserOrSkip(skip: (note?: string) => void): boolean {
  if (browserAvailable) return true;
  const banner = unavailableBanner();
  console.error(banner);
  if (process.env['CI']) {
    throw new Error(`${SKIP_NOTE}. In CI that is a failure, not a skip.${banner}`);
  }
  skip(SKIP_NOTE);
  return false;
}

afterAll(async () => {
  if (browserAvailable) {
    await closeBrowser();
    return;
  }
  // Vitest's default reporter swallows console output from passing/skipped
  // tests, so the warning goes straight to the real stderr. This is the line
  // that keeps an unrun guard from reading as a pass.
  process.stderr.write(unavailableBanner());
});

// ---------------------------------------------------------------------------
// A font origin with the API's CORS posture: bytes served, no ACAO header.
// ---------------------------------------------------------------------------

const servers: Server[] = [];

afterAll(() => {
  for (const s of servers) s.close();
});

interface FontOrigin {
  baseUrl: string;
  /** Every font path the render browser actually asked this origin for. */
  hits: string[];
}

async function startFontOrigin(): Promise<FontOrigin> {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    const name = (req.url ?? '').split('/').pop() ?? '';
    hits.push(name);
    const file = `${FONT_DIR}/${name}`;
    if (!/^[A-Za-z0-9._-]+$/.test(name) || !existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    // Deliberately no Access-Control-Allow-Origin — this is what the API does
    // for the renderer's null origin.
    res.setHeader('Content-Type', 'font/ttf');
    res.end(readFileSync(file));
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://localhost:${port}/assets/fonts`, hits };
}

// ---------------------------------------------------------------------------
// A slide whose only interesting property is its text
// ---------------------------------------------------------------------------

const theme: Theme = {
  name: 'font-guard',
  colors: { surface: '#ffffff', 'on-surface': '#000000' },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontSize: '96px',
      fontWeight: '800',
      lineHeight: '1.1',
      letterSpacing: '-0.04em',
    },
    'body-md': {
      fontFamily: 'Inter',
      fontSize: '48px',
      fontWeight: '400',
      lineHeight: '1.4',
    },
  },
  rounded: { md: '0.75rem' },
  spacing: { md: '24px' },
  shapes: { borderRadius: '0.5rem', borderWidth: '2px' },
};

const slide: TNode = {
  kind: 'box',
  style: {
    width: '1080px',
    height: '1080px',
    background: '$color.surface',
    padding: '$spacing.md',
    display: 'flex',
    flexDirection: 'column',
    gap: '$spacing.md',
  },
  children: [
    {
      kind: 'text',
      style: { typography: 'display', color: '$color.on-surface' },
      text: 'Handgloves 0123',
    },
    {
      kind: 'text',
      style: { typography: 'body-md', color: '$color.on-surface' },
      text: 'The quick brown fox jumps over the lazy dog.',
    },
  ],
};

function slideHtml(fontBaseUrl: string): string {
  return renderTemplate(slide, {}, theme, { index: 1, total: 1, fontBaseUrl });
}

/**
 * The same document with Inter renamed out of existence — what the slide looks
 * like when the @font-face never resolves. Renaming the family in the
 * `@font-face` rule *and* in every `font-family` keeps the fallback stack
 * ('…, sans-serif') identical, so any pixel difference is Inter and only Inter.
 */
function fallbackHtml(html: string): string {
  return html.replace(/'Inter'/g, "'NoSuchFaceOnThisMachine'");
}

// ---------------------------------------------------------------------------
// The guard
// ---------------------------------------------------------------------------

describe('rendered slides are set in Inter', () => {
  it('a rendered slide does not match the no-Inter fallback', async (ctx) => {
    if (!browserOrSkip((note) => ctx.skip(note))) return;

    const origin = await startFontOrigin();
    const html = slideHtml(origin.baseUrl);

    const inter = await htmlToJpeg(html);
    const interAgain = await htmlToJpeg(html);
    const fallback = await htmlToJpeg(fallbackHtml(html));

    // Rendering is deterministic, so the comparison below means something.
    expect(
      inter.equals(interAgain),
      'two renders of the same slide differ — the comparison below is noise, not signal',
    ).toBe(true);

    expect(
      inter.equals(fallback),
      'the rendered slide is pixel-identical to the same slide with Inter removed: ' +
        'Inter did not load and the render fell back to the default sans',
    ).toBe(false);
  }, 60_000);

  it('renders Inter without reaching the HTTP font origin at all', async (ctx) => {
    if (!browserOrSkip((note) => ctx.skip(note))) return;

    const origin = await startFontOrigin();
    await htmlToJpeg(slideHtml(origin.baseUrl));

    expect(
      origin.hits,
      'the render browser fetched fonts over HTTP — the render must not depend ' +
        'on the API being up, or on its CORS policy',
    ).toEqual([]);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// Always runs — no browser needed
// ---------------------------------------------------------------------------

describe('localFontPath', () => {
  it('resolves every weight the interpreter injects', () => {
    for (const name of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
      const file = localFontPath(`http://localhost:3001/assets/fonts/Inter-${name}.ttf`);
      expect(file, `Inter-${name}.ttf is missing from ${FONT_DIR}`).toBeTruthy();
      expect(existsSync(file as string)).toBe(true);
    }
  });

  it('refuses path traversal and unknown files', () => {
    expect(localFontPath('http://localhost:3001/assets/fonts/../../package.json')).toBeNull();
    expect(localFontPath('http://localhost:3001/assets/fonts/%2e%2e%2fpackage.json')).toBeNull();
    expect(localFontPath('http://localhost:3001/assets/fonts/Nope-Regular.ttf')).toBeNull();
    expect(localFontPath('not a url')).toBeNull();
  });
});

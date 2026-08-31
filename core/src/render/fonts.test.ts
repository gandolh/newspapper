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
 * The comparison is only worth anything if the control genuinely cannot be set
 * in Inter. The first version of this file built its control by renaming
 * `'Inter'` in the HTML, which worked only while the inline `font-family` was
 * unquoted — quote it and the rename reached the text too, the `@font-face`
 * still loaded the real TTF, and control and subject became the same document.
 * The control is now a document that **never names Inter at all**, checked
 * after it is built (`assertCannotLoadInter`) rather than assumed from how it
 * was built. See `noInterHtml` below.
 *
 * If Chromium is missing the pixel tests are reported SKIPPED (never passed), a
 * banner goes to stderr, and in CI they fail outright — "green because nothing
 * ran" is the failure mode this file exists to avoid. The control's own
 * structural property is asserted without a browser, so that half is never
 * skipped.
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

const SKIP_NOTE = 'Chromium unavailable — the typeface guard did NOT verify any pixels';

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

/**
 * The family the subject's typography tokens declare.
 *
 * The one knob in this file. Quoting it (`"'Inter'"`) must change nothing about
 * whether the guard works — that is the property brief 71 exists to establish,
 * and the way to re-check it by hand is to quote this string, run the file, and
 * put it back.
 */
const FACE = 'Inter';

/** `FACE` without whatever quoting the theme puts around it. */
const FACE_NAME = FACE.replace(/^['"]|['"]$/g, '');

/** A family name nothing on any machine answers to, and nothing here defines. */
const ABSENT_NAME = 'NoSuchFaceOnThisMachine';

/** The guard's slide theme, parameterised by the family its text asks for. */
function themeWithFamily(fontFamily: string): Theme {
  return {
    name: 'font-guard',
    colors: { surface: '#ffffff', 'on-surface': '#000000' },
    typography: {
      display: {
        fontFamily,
        fontSize: '96px',
        fontWeight: '800',
        lineHeight: '1.1',
        letterSpacing: '-0.04em',
      },
      'body-md': {
        fontFamily,
        fontSize: '48px',
        fontWeight: '400',
        lineHeight: '1.4',
      },
    },
    rounded: { md: '0.75rem' },
    spacing: { md: '24px' },
    shapes: { borderRadius: '0.5rem', borderWidth: '2px' },
  };
}

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

/** The subject: the real interpreter output, asking for the real face. */
function slideHtml(fontBaseUrl: string): string {
  return renderTemplate(slide, {}, themeWithFamily(FACE), { index: 1, total: 1, fontBaseUrl });
}

/**
 * Throw unless `html` is *structurally* incapable of being set in Inter: it
 * defines no font face at all, and it does not name the face anywhere, in any
 * case or quoting. A document that never asks for a family cannot be drawn in
 * it — no reasoning about quoting or the cascade required.
 *
 * This checks the finished string, not the edits that produced it. That is the
 * whole point: the previous control was correct only as a side effect of a
 * regex matching less than its author thought, and the way that goes wrong is
 * silent.
 */
function assertCannotLoadInter(html: string): void {
  if (/@font-face/i.test(html)) {
    throw new Error(
      'the no-Inter control still defines an @font-face — it can load a face, so it is not a control',
    );
  }
  const at = html.toLowerCase().indexOf(FACE_NAME.toLowerCase());
  if (at !== -1) {
    const around = html.slice(Math.max(0, at - 60), at + 60);
    throw new Error(
      `the no-Inter control names "${FACE_NAME}" at offset ${at} — it could be set in ` +
        `${FACE_NAME}, so it is not a control. Context: …${around}…`,
    );
  }
}

/**
 * The control, derived from the subject document itself by two unconditional,
 * quoting-blind edits:
 *
 *   1. every `@font-face` block is deleted, so the document defines no face at
 *      all and there is nothing for the disk route in `fonts.ts` to fulfil;
 *   2. every mention of the face is renamed to a family nothing answers to —
 *      matched as a word, so `Inter`, `'Inter'` and `"Inter"` all go.
 *
 * Because the control *is* the subject document, everything that is not the
 * face — the text, the colours, the sizes, the `,sans-serif` fallback tail —
 * is identical by construction, so a pixel difference is Inter and only Inter.
 *
 * The guarantee is not those two edits. It is `assertCannotLoadInter`, which
 * reads the finished string and refuses to hand back a document that still
 * defines a face or still names Inter. However the interpreter chooses to
 * quote, order or spell what it emits, a control that came back from here
 * cannot be set in Inter.
 */
function noInterHtml(fontBaseUrl: string): string {
  const control = slideHtml(fontBaseUrl)
    .replace(/@font-face\{[^}]*\}/g, '')
    .replace(new RegExp(`\\b${FACE_NAME}\\b`, 'gi'), ABSENT_NAME);
  assertCannotLoadInter(control);
  return control;
}

/** Every `font-family` declared after the `<style>` block — i.e. the inline ones. */
function inlineFamilies(html: string): string[] {
  const body = html.slice(html.indexOf('</style>'));
  return [...body.matchAll(/font-family:([^;"]*)/g)].map((m) => (m[1] ?? '').trim());
}

// ---------------------------------------------------------------------------
// The control itself — asserted with no browser, so it is never skipped
// ---------------------------------------------------------------------------

describe('the no-Inter control', () => {
  it('defines no font face and never names Inter', () => {
    const control = noInterHtml('/assets/fonts');
    expect(control, 'the control still defines a face it could be drawn in').not.toMatch(
      /@font-face/i,
    );
    expect(
      control.toLowerCase(),
      'the control names the face somewhere — it is not a no-Inter document',
    ).not.toContain(FACE_NAME.toLowerCase());
  });

  it("keeps the slide, and the subject's fallback tail, so the two fall back alike", () => {
    const subject = inlineFamilies(slideHtml('/assets/fonts'));
    const control = inlineFamilies(noInterHtml('/assets/fonts'));

    expect(subject.length, 'the slide declares no inline font-family at all').toBeGreaterThan(0);
    expect(
      control,
      'control and subject declare different font stacks — a pixel difference ' +
        'between them would not be attributable to the face alone',
    ).toEqual(subject.map((f) => f.replace(FACE_NAME, ABSENT_NAME)));

    for (const family of control) {
      expect(family.endsWith(',sans-serif'), `control declares "${family}"`).toBe(true);
    }
    expect(noInterHtml('/assets/fonts')).toContain('Handgloves 0123');
  });

  it('the subject, unlike the control, does define the face and ask for it', () => {
    const subject = slideHtml('/assets/fonts');
    expect(subject, 'the interpreter stopped emitting @font-face').toMatch(/@font-face/);
    expect(subject).toContain('Inter-Regular.ttf');
  });
});

// ---------------------------------------------------------------------------
// The guard
// ---------------------------------------------------------------------------

describe('rendered slides are set in Inter', () => {
  it('a rendered slide does not match the same slide with no Inter in it', async (ctx) => {
    if (!browserOrSkip((note) => ctx.skip(note))) return;

    const origin = await startFontOrigin();
    const html = slideHtml(origin.baseUrl);

    const inter = await htmlToJpeg(html);
    const interAgain = await htmlToJpeg(html);
    const control = await htmlToJpeg(noInterHtml(origin.baseUrl));

    // Rendering is deterministic, so the comparison below means something.
    expect(
      inter.equals(interAgain),
      'two renders of the same slide differ — the comparison below is noise, not signal',
    ).toBe(true);

    expect(
      inter.equals(control),
      'the rendered slide is pixel-identical to a document that does not contain ' +
        'Inter at all: Inter did not load and the render fell back to the default sans',
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

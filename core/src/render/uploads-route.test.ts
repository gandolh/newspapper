/**
 * Brief 88. `uploads-route.ts` is what let `/uploads/*` become a guarded route:
 * the render browser carries no session, so it reads `<Image>` bytes from disk
 * through a Playwright route instead of over HTTP. Until this file nothing
 * exercised it, so a glob that stopped matching, or a render call that dropped
 * `db`, would have rendered every production image blank with the suite green.
 *
 * The slide here is what a compiled `<Image>` amounts to: a background whose URL
 * is an absolute `…/uploads/<ref>`. The origin is a port nothing listens on, so
 * the only way red reaches the pixel is the interceptor serving it from disk.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

import { getDb, type DB } from '../storage/db.js';
import { saveUpload } from '../uploads/index.js';
import { htmlToJpeg } from './screenshot.js';
import { probeChromium, type ChromiumGuard } from './test-support/chromium.js';
import { localUploadFile } from './uploads-route.js';

/** A port nothing listens on: a request that escapes interception just fails. */
const DEAD_ORIGIN = 'http://127.0.0.1:9';

let tmp: string;
let db: DB;
let ref: string;
let chromium: ChromiumGuard;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'np-uploads-route-'));
  process.env['UPLOADS_DIR'] = join(tmp, 'uploads');
  db = getDb(join(tmp, 'test.db'));
  const red = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
  ({ ref } = await saveUpload(db, { filename: 'red.png', data: red }));

  chromium = await probeChromium(
    'uploads-route.test',
    'that the render browser reads uploads from disk',
  );
});

afterAll(async () => {
  await chromium.close();
  db.close();
  delete process.env['UPLOADS_DIR'];
  rmSync(tmp, { recursive: true, force: true });
});

function slide(src: string): string {
  return `<!doctype html><html><body style="margin:0">
    <div style="width:1080px;height:1080px;background:#ffffff;
      background-image:url('${src}');background-size:cover"></div>
  </body></html>`;
}

/** The centre pixel of a rendered JPEG, as [r, g, b]. */
async function centre(jpeg: Buffer): Promise<[number, number, number]> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const i = (540 * info.width + 540) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

const isRed = ([r, g, b]: [number, number, number]) => r > 200 && g < 60 && b < 60;
const isWhite = ([r, g, b]: [number, number, number]) => r > 230 && g > 230 && b > 230;

describe('the render browser reads uploads from disk', () => {
  it('serves the upload bytes when the render is given the db', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const jpeg = await htmlToJpeg(slide(`${DEAD_ORIGIN}/uploads/${ref}`), { db });
    expect(isRed(await centre(jpeg))).toBe(true);
  });

  it('without the db the image is blank: the documented contract', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const jpeg = await htmlToJpeg(slide(`${DEAD_ORIGIN}/uploads/${ref}`));
    expect(isWhite(await centre(jpeg))).toBe(true);
  });

  it('a ref that names no upload, or a traversal, is not served', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // A real file just outside the store, which a traversal would be aiming at.
    writeFileSync(
      join(tmp, 'secret.png'),
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .png()
        .toBuffer(),
    );
    for (const src of [
      `${DEAD_ORIGIN}/uploads/nothing-here-00000000`,
      `${DEAD_ORIGIN}/uploads/..%2fsecret.png`,
      `${DEAD_ORIGIN}/uploads/../secret.png`,
    ]) {
      const jpeg = await htmlToJpeg(slide(src), { db });
      expect(isWhite(await centre(jpeg)), src).toBe(true);
    }
  });
});

describe('localUploadFile', () => {
  it('resolves a real ref, at whatever origin the slide names', () => {
    expect(localUploadFile(db, `${DEAD_ORIGIN}/uploads/${ref}`)).toMatch(/\.(jpe?g|png|webp)$/);
  });

  it('returns null for unknown, malformed, traversal and original-bytes URLs', () => {
    for (const url of [
      `${DEAD_ORIGIN}/uploads/nothing-here-00000000`,
      `${DEAD_ORIGIN}/uploads/..%2fsecret.png`,
      `${DEAD_ORIGIN}/uploads/../../etc/passwd`,
      `${DEAD_ORIGIN}/uploads/${ref}/original`,
      'not a url',
    ]) {
      expect(localUploadFile(db, url), url).toBeNull();
    }
  });
});

import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const FONTS_DIR = join(config.paths.root, 'fonts');

interface FontDef {
  family: string;
  weight: number;
  fileName: string;
}

const FONT_DEFS: FontDef[] = [
  { family: 'Epilogue', weight: 700, fileName: 'Epilogue-700.ttf' },
  { family: 'Epilogue', weight: 800, fileName: 'Epilogue-800.ttf' },
  { family: 'Manrope', weight: 400, fileName: 'Manrope-400.ttf' },
  { family: 'Manrope', weight: 700, fileName: 'Manrope-700.ttf' },
  { family: 'Newsreader', weight: 400, fileName: 'Newsreader-400.ttf' },
  { family: 'Newsreader', weight: 600, fileName: 'Newsreader-600.ttf' },
  { family: 'Newsreader', weight: 700, fileName: 'Newsreader-700.ttf' },
  { family: 'Space Grotesk', weight: 400, fileName: 'SpaceGrotesk-400.ttf' },
  { family: 'Space Grotesk', weight: 500, fileName: 'SpaceGrotesk-500.ttf' },
];

async function fetchTtfUrl(family: string, weight: number): Promise<string> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' },
  });
  if (!res.ok) throw new Error(`Google Fonts API ${res.status} for ${family}:${weight}`);
  const css = await res.text();
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error(`No font URL found for ${family}:${weight}`);
  return match[1];
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font download failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface FontPaths {
  family: string;
  weight: number;
  path: string;
}

export async function ensureFonts(): Promise<FontPaths[]> {
  await mkdir(FONTS_DIR, { recursive: true });

  const results: FontPaths[] = [];

  for (const def of FONT_DEFS) {
    const filePath = join(FONTS_DIR, def.fileName);
    const exists = await access(filePath).then(() => true).catch(() => false);

    if (!exists) {
      logger.debug(`Downloading font ${def.family}:${def.weight}...`);
      try {
        const ttfUrl = await fetchTtfUrl(def.family, def.weight);
        const data = await downloadBuffer(ttfUrl);
        await writeFile(filePath, data);
      } catch (err) {
        logger.warn(`Could not download ${def.family}:${def.weight} — ${(err as Error).message}`);
        continue;
      }
    }

    results.push({ family: def.family, weight: def.weight, path: filePath });
  }

  return results;
}

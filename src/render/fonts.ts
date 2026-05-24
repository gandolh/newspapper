import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal';
}

const FILES: ReadonlyArray<{ file: string; weight: SatoriFont['weight'] }> = [
  { file: 'Inter-Regular.ttf', weight: 400 },
  { file: 'Inter-Medium.ttf', weight: 500 },
  { file: 'Inter-SemiBold.ttf', weight: 600 },
  { file: 'Inter-Bold.ttf', weight: 700 },
  { file: 'Inter-ExtraBold.ttf', weight: 800 },
  { file: 'Inter-Black.ttf', weight: 900 },
];

let cached: SatoriFont[] | null = null;

export function loadFonts(): SatoriFont[] {
  if (cached) return cached;
  cached = FILES.map(({ file, weight }) => ({
    name: 'Inter',
    data: readFileSync(resolve('assets/fonts', file)),
    weight,
    style: 'normal' as const,
  }));
  return cached;
}

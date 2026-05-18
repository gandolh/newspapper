import satori from 'satori';
import type { ReactNode } from 'react';
import { loadFonts } from './fonts.js';
import { SLIDE_SIZE } from './slides/frame.js';

export async function toSvg(node: ReactNode): Promise<string> {
  return satori(node as Parameters<typeof satori>[0], {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
    fonts: loadFonts(),
  });
}

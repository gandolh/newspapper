import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Theme {
  name: string;
  colors: Record<string, string>;
  typography: Record<
    string,
    { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing?: string }
  >;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  shapes: { borderRadius: string; borderWidth: string };
}

export function loadTheme(name: string): Theme {
  const path = resolve('design-systems', `${name}.json`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Theme;
}

export function px(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  if (value.endsWith('rem')) return n * 16;
  return n;
}

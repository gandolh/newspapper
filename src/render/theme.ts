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
  const path = resolve('assets/design-systems', `${name}.json`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Theme;
}

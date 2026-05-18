import { Resvg } from '@resvg/resvg-js';

export function toPng(svg: string): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  return resvg.render().asPng();
}

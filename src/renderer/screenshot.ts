import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { designLoader } from "./design-loader.js";
import { ensureFonts } from "./font-loader.js";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

interface Slide {
  type: string;
  text?: string;
  attribution?: string;
  [key: string]: unknown;
}

interface TypoToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
}

interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, TypoToken>;
  spacing: Record<string, string>;
  shapes: { borderRadius: string; borderWidth: string };
}

const SIZE = 1080;

function parseLength(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  if (v.endsWith("rem")) return parseFloat(v) * 16;
  return parseFloat(v);
}

function getSpacing(sp: Record<string, string>, ...keys: string[]): number {
  for (const k of keys) {
    if (sp[k] !== undefined) return parseLength(sp[k]);
  }
  return 24;
}

function getTypo(t: Record<string, TypoToken>, ...keys: string[]): TypoToken {
  for (const k of keys) {
    if (t[k]) return t[k];
  }
  return {
    fontFamily: "sans-serif",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: "1.5",
  };
}

function setTypo(ctx: SKRSContext2D, typo: TypoToken) {
  ctx.font = `${typo.fontWeight} ${typo.fontSize} "${typo.fontFamily}", sans-serif`;
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke: string,
  strokeW: number,
  shadow?: string,
) {
  if (shadow) {
    ctx.beginPath();
    roundedRect(ctx, x + 4, y + 4, w, h, r);
    ctx.fillStyle = shadow;
    ctx.fill();
  }
  ctx.beginPath();
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  }
}

function drawBackground(ctx: SKRSContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(0,0,0,0.018)";
  ctx.lineWidth = 1;
  for (let y = 2; y < SIZE; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
}

function drawBadge(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  typo: TypoToken,
  r: number,
  bg: string,
  fg: string,
  padX = 16,
  padY = 8,
): number {
  setTypo(ctx, typo);
  const fontSize = parseLength(typo.fontSize);
  const badgeW = ctx.measureText(text).width + padX * 2;
  const badgeH = fontSize + padY * 2;
  drawCard(ctx, x, y, badgeW, badgeH, r, bg, bg, 0);
  ctx.fillStyle = fg;
  ctx.fillText(text, x + padX, y + padY + fontSize);
  return badgeH;
}

// ---- Slide type renderers ----

function renderTitle(
  ctx: SKRSContext2D,
  slide: Slide,
  d: DesignTokens,
  slideNum: number,
  total: number,
) {
  const c = d.colors;
  const r = parseLength(d.shapes.borderRadius);
  const borderW = parseLength(d.shapes.borderWidth);
  const margin = getSpacing(d.spacing, "container-margin", "margin");
  const padX = getSpacing(d.spacing, "lg", "margin");
  const padY = getSpacing(d.spacing, "lg", "margin");
  const spMd = getSpacing(d.spacing, "md", "gutter");

  const cardW = Math.min(900, SIZE - margin * 2);
  const cardX = (SIZE - cardW) / 2;
  const textMaxW = cardW - padX * 2;

  const titleTypo = getTypo(d.typography, "headline-lg", "display-lg");
  setTypo(ctx, titleTypo);
  const titleFontSize = parseLength(titleTypo.fontSize);
  const titleLineH = parseFloat(titleTypo.lineHeight) * titleFontSize;
  const titleLines = wrapText(ctx, slide.text || "", textMaxW);

  const labelTypo = getTypo(
    d.typography,
    "label-bold",
    "meta-technical",
    "label-sm",
  );
  const labelFontSize = parseLength(labelTypo.fontSize);
  const badgeH = labelFontSize + 16;

  const cardH =
    padY +
    badgeH +
    spMd +
    titleLines.length * titleLineH +
    spMd +
    labelFontSize +
    padY;
  const cardY = (SIZE - cardH) / 2;

  drawBackground(ctx, c.surface || c.background);
  drawCard(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    r,
    c["surface-container"],
    c.outline,
    borderW,
    c.outline,
  );

  let curY = cardY + padY;

  const bh = drawBadge(
    ctx,
    "NEWSPAPPER",
    cardX + padX,
    curY,
    labelTypo,
    r,
    c.primary,
    c["on-primary"],
  );
  curY += bh + spMd;

  setTypo(ctx, titleTypo);
  ctx.fillStyle = c["on-surface"];
  for (const line of titleLines) {
    ctx.fillText(line, cardX + padX, curY + titleFontSize);
    curY += titleLineH;
  }
  curY += spMd;

  setTypo(ctx, labelTypo);
  ctx.fillStyle = c["on-surface-variant"];
  ctx.fillText("News Summary", cardX + padX, curY + labelFontSize);
  const counter = `${slideNum}/${total}`;
  ctx.fillText(
    counter,
    cardX + cardW - padX - ctx.measureText(counter).width,
    curY + labelFontSize,
  );
}

function renderBody(
  ctx: SKRSContext2D,
  slide: Slide,
  d: DesignTokens,
  slideNum: number,
  total: number,
) {
  const c = d.colors;
  const r = parseLength(d.shapes.borderRadius);
  const borderW = parseLength(d.shapes.borderWidth);
  const margin = getSpacing(d.spacing, "container-margin", "margin");
  const padX = getSpacing(d.spacing, "md", "gutter");
  const padY = getSpacing(d.spacing, "md", "gutter");
  const spMd = getSpacing(d.spacing, "md", "gutter");
  const spSm = getSpacing(d.spacing, "sm", "unit");

  const cardW = Math.min(900, SIZE - margin * 2);
  const cardX = (SIZE - cardW) / 2;
  const textMaxW = cardW - padX * 2;

  const bodyTypo = getTypo(d.typography, "body-lg");
  setTypo(ctx, bodyTypo);
  const bodyFontSize = parseLength(bodyTypo.fontSize);
  const bodyLineH = parseFloat(bodyTypo.lineHeight) * bodyFontSize;
  const bodyLines = wrapText(ctx, slide.text || "", textMaxW);

  const labelTypo = getTypo(
    d.typography,
    "label-bold",
    "meta-technical",
    "label-sm",
  );
  const labelFontSize = parseLength(labelTypo.fontSize);
  const badgeH = labelFontSize + 12;

  const cardH =
    padY + badgeH + spSm + 1 + spMd + bodyLines.length * bodyLineH + padY;
  const cardY = (SIZE - cardH) / 2;

  drawBackground(ctx, c.surface || c.background);
  drawCard(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    r,
    c["surface-container"],
    c.outline,
    borderW,
    c.outline,
  );

  let curY = cardY + padY;

  // Header row
  setTypo(ctx, labelTypo);
  const badgeTextW = ctx.measureText("NEWSPAPPER").width;
  const badgePadX = 12,
    badgePadY = 6;
  const badgeRealH = labelFontSize + badgePadY * 2;
  drawCard(
    ctx,
    cardX + padX,
    curY,
    badgeTextW + badgePadX * 2,
    badgeRealH,
    r,
    c.secondary,
    c.secondary,
    0,
  );
  ctx.fillStyle = c["on-secondary"];
  ctx.fillText(
    "NEWSPAPPER",
    cardX + padX + badgePadX,
    curY + badgePadY + labelFontSize,
  );

  const counter = `${slideNum}/${total}`;
  ctx.fillStyle = c["on-surface-variant"];
  ctx.fillText(
    counter,
    cardX + cardW - padX - ctx.measureText(counter).width,
    curY + labelFontSize,
  );

  curY += badgeRealH + spSm;

  // Divider
  ctx.strokeStyle = c["outline-variant"] || c.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + padX, curY);
  ctx.lineTo(cardX + cardW - padX, curY);
  ctx.stroke();
  curY += spMd;

  // Body text
  setTypo(ctx, bodyTypo);
  ctx.fillStyle = c["on-surface"];
  for (const line of bodyLines) {
    ctx.fillText(line, cardX + padX, curY + bodyFontSize);
    curY += bodyLineH;
  }
}

function renderQuote(
  ctx: SKRSContext2D,
  slide: Slide,
  d: DesignTokens,
  slideNum: number,
  total: number,
) {
  const c = d.colors;
  const r = parseLength(d.shapes.borderRadius);
  const margin = getSpacing(d.spacing, "container-margin", "margin");
  const padX = getSpacing(d.spacing, "lg", "margin");
  const spMd = getSpacing(d.spacing, "md", "gutter");
  const spSm = getSpacing(d.spacing, "sm", "unit");

  const cardW = Math.min(900, SIZE - margin * 2);
  const cardX = (SIZE - cardW) / 2;
  const textMaxW = cardW - padX * 2;

  const quoteTypo = getTypo(d.typography, "headline-md");
  setTypo(ctx, quoteTypo);
  const quoteFontSize = parseLength(quoteTypo.fontSize);
  const quoteLineH = parseFloat(quoteTypo.lineHeight) * quoteFontSize;
  const quoteLines = wrapText(ctx, slide.text || "", textMaxW);

  const labelTypo = getTypo(
    d.typography,
    "label-bold",
    "meta-technical",
    "label-sm",
  );
  const labelFontSize = parseLength(labelTypo.fontSize);

  // Full primary background
  ctx.fillStyle = c.primary;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  for (let y = 2; y < SIZE; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }

  const quoteMarkH = 100;
  const attrH = labelFontSize + spSm * 2;
  const totalH = quoteMarkH + quoteLines.length * quoteLineH + spMd + attrH;
  const startY = (SIZE - totalH) / 2;

  // Decorative quote mark
  const displayTypo = getTypo(
    d.typography,
    "display",
    "display-lg",
    "headline-lg",
  );
  ctx.font = `${displayTypo.fontWeight || "800"} 180px "${displayTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["primary-container"];
  ctx.globalAlpha = 0.3;
  ctx.fillText('"', cardX, startY + 130);
  ctx.globalAlpha = 1.0;

  // Quote text
  setTypo(ctx, quoteTypo);
  ctx.fillStyle = c["on-primary"];
  let curY = startY + quoteMarkH;
  for (const line of quoteLines) {
    ctx.fillText(line, cardX + padX, curY + quoteFontSize);
    curY += quoteLineH;
  }
  curY += spMd;

  // Attribution badge
  setTypo(ctx, labelTypo);
  const attrText = `— ${(slide.attribution || "").toUpperCase()}`;
  const attrW = ctx.measureText(attrText).width + spSm * 2;
  drawCard(
    ctx,
    cardX + padX,
    curY,
    attrW,
    attrH,
    r,
    c["primary-container"],
    c["primary-container"],
    0,
  );
  ctx.fillStyle = c["on-primary-container"];
  ctx.fillText(attrText, cardX + padX + spSm, curY + spSm + labelFontSize);

  // Slide counter
  const counter = `${slideNum}/${total}`;
  ctx.fillStyle = c["on-primary-container"];
  ctx.fillText(
    counter,
    cardX + cardW - ctx.measureText(counter).width,
    curY + labelFontSize,
  );
}

// ---- Renderer class ----

export class ScreenshotRenderer {
  private fontsLoaded = false;

  async init(): Promise<void> {
    if (this.fontsLoaded) return;
    logger.debug("Loading fonts for rendering...");
    const fontPaths = await ensureFonts();
    for (const { family, path } of fontPaths) {
      GlobalFonts.registerFromPath(path, family);
    }
    this.fontsLoaded = true;
  }

  async close(): Promise<void> {
    // no-op: no browser to close
  }

  async renderSlides(
    slides: Slide[],
    designName: string,
    outputDir: string,
  ): Promise<string[]> {
    await this.init();
    await mkdir(join(outputDir, "slides"), { recursive: true });
    logger.info(`Rendering ${slides.length} slides with ${designName}...`);

    const design = (await designLoader.load(designName)) as DesignTokens;
    const outputPaths: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const outputPath = join(
        outputDir,
        "slides",
        `${String(i + 1).padStart(2, "0")}-${slide.type}.png`,
      );

      const canvas = createCanvas(SIZE, SIZE);
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "alphabetic";

      switch (slide.type) {
        case "title-main":
        case "title-question":
        case "title-statement":
          renderTitle(ctx, slide, design, i + 1, slides.length);
          break;
        case "quote-classic":
        case "quote-reaction":
        case "quote-pullout":
          renderQuote(ctx, slide, design, i + 1, slides.length);
          break;
        case "body-text":
        case "body-list":
        case "body-comparison":
        default:
          renderBody(ctx, slide, design, i + 1, slides.length);
      }

      const pngBuf = await canvas.encode("png");
      const compressed = await sharp(pngBuf)
        .png({ quality: config.images.quality, compressionLevel: 9 })
        .toBuffer();
      await writeFile(outputPath, compressed);

      logger.debug(`Rendered: ${outputPath}`);
      outputPaths.push(outputPath);
    }

    logger.success(
      `Rendered ${outputPaths.length} slides to ${outputDir}/slides/`,
    );
    return outputPaths;
  }
}

export const screenshotRenderer = new ScreenshotRenderer();

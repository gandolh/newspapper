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
  const s = String(v);
  if (s.endsWith("rem")) return parseFloat(s) * 16;
  if (s.endsWith("px")) return parseFloat(s);
  return parseFloat(s);
}

function getTypo(t: Record<string, TypoToken>, ...keys: string[]): TypoToken {
  for (const k of keys) {
    if (t[k]) return t[k];
  }
  return {
    fontFamily: "sans-serif",
    fontSize: "24px",
    fontWeight: "400",
    lineHeight: "1.5",
  };
}

/**
 * Robust text wrapping that handles:
 * 1. Newlines (\n)
 * 2. Words longer than maxWidth
 * 3. Empty lines
 */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
          metrics = ctx.measureText(currentLine);
        }

        // If a single word is wider than maxWidth, break it char by char
        if (metrics.width > maxWidth) {
          let wordToBreak = currentLine;
          currentLine = "";
          for (const char of wordToBreak) {
            if (ctx.measureText(currentLine + char).width > maxWidth) {
              if (currentLine) lines.push(currentLine);
              currentLine = char;
            } else {
              currentLine += char;
            }
          }
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function drawBackground(ctx: SKRSContext2D, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

function drawGridTexture(ctx: SKRSContext2D, gridSize = 32, opacity = 0.05, lightGrid = false) {
  ctx.save();
  const color = lightGrid ? `rgba(255, 255, 255, ${opacity})` : `rgba(27, 28, 28, ${opacity})`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= SIZE; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= SIZE; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlockedShadow(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  offsetX = 8,
  offsetY = 8,
  color = "#1b1c1c"
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x + offsetX, y + offsetY, w, h);
  ctx.restore();
}

function drawStructuralBorder(
  ctx: SKRSContext2D,
  borderWidth = 20,
  color = "#1b1c1c"
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, SIZE - borderWidth, SIZE - borderWidth);
  ctx.restore();
}

function drawBadge(ctx: SKRSContext2D, d: DesignTokens, x: number, y: number, text: string, options: { inverted?: boolean, shadow?: boolean } = {}) {
  const c = d.colors;
  const badgeW = 220;
  const badgeH = 44;
  
  if (options.shadow) {
    drawBlockedShadow(ctx, x, y, badgeW, badgeH, 8, 8, c["on-surface"]);
  }
  
  ctx.save();
  ctx.fillStyle = options.inverted ? c.surface : c.primary;
  ctx.fillRect(x, y, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  // Force weight based on what we have registered
  const weight = labelTypo.fontWeight === '400' ? '400' : '700';
  ctx.font = `${weight} 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = options.inverted ? c["on-surface"] : c["on-primary"];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + badgeW / 2, y + badgeH / 2 + 2);
  ctx.restore();
}

// ===== RENDERERS =====

function renderTitleMain(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 20, c["on-surface"]);
  drawBadge(ctx, d, margin, margin, "NEWSPAPPER", { shadow: true });

  const displayTypo = getTypo(d.typography, "display");
  const fontSize = 96;
  ctx.save();
  ctx.font = `800 ${fontSize}px "${displayTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  
  const lines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - margin * 2);
  const lineH = fontSize * 1.0;
  let y = SIZE - margin - (lines.length - 1) * lineH;
  
  for (const line of lines) {
    ctx.fillText(line, margin, y);
    y += lineH;
  }
  ctx.restore();

  // Accent bars
  ctx.save();
  const barX = SIZE - margin - 64;
  const barY = SIZE - margin - 50;
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(barX, barY, 64, 4);
  ctx.fillRect(barX + 32, barY + 12, 32, 4);
  ctx.restore();
}

function renderTitleQuestion(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;

  drawBackground(ctx, c.primary);
  drawGridTexture(ctx, 32, 0.05, true);
  drawStructuralBorder(ctx, 20, c["on-surface"]);
  drawBadge(ctx, d, SIZE - margin - 220, 80, "NEWSPAPPER", { inverted: true, shadow: true });

  const displayTypo = getTypo(d.typography, "display");
  const fontSize = 110;
  ctx.save();
  ctx.font = `800 ${fontSize}px "${displayTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const lines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - margin * 2);
  const lineH = fontSize * 0.95;
  let startY = SIZE / 2 - ((lines.length - 1) * lineH) / 2;

  // Shadow first
  ctx.fillStyle = c["on-surface"];
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2 + 6, y + 6);
    y += lineH;
  }

  // Main text
  ctx.fillStyle = c["on-primary"];
  y = startY;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2, y);
    y += lineH;
  }
  ctx.restore();
}

function renderTitleStatement(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;

  drawBackground(ctx, c["primary-container"]);
  drawGridTexture(ctx, 40, 0.05);
  drawStructuralBorder(ctx, 20, c["on-surface"]);
  drawBadge(ctx, d, margin, margin, "NEWSPAPPER", { inverted: true });

  const wrapperY = SIZE / 2 - 150;
  const wrapperH = 300;
  
  ctx.save();
  ctx.fillStyle = "rgba(27, 28, 28, 0.1)";
  ctx.fillRect(margin + 20, wrapperY, SIZE - margin * 2 - 20, wrapperH);
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(margin, wrapperY, 20, wrapperH);
  ctx.restore();

  const displayTypo = getTypo(d.typography, "display");
  const fontSize = 90;
  ctx.save();
  ctx.font = `800 ${fontSize}px "${displayTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  
  const lines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - margin * 2 - 80);
  const lineH = fontSize * 1.0;
  let y = SIZE / 2 - ((lines.length - 1) * lineH) / 2;

  // Shadow
  ctx.fillStyle = c["on-surface"];
  for (const line of lines) {
    ctx.fillText(line, margin + 64, y + 4);
    y += lineH;
  }

  // Main
  ctx.fillStyle = c.surface;
  y = SIZE / 2 - ((lines.length - 1) * lineH) / 2;
  for (const line of lines) {
    ctx.fillText(line, margin + 60, y);
    y += lineH;
  }
  ctx.restore();
}

function renderBodyText(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;
  const headerH = 120;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 12, c["on-surface"]);

  ctx.save();
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();
  ctx.restore();

  drawBadge(ctx, d, 48, 40, "NEWSPAPPER", { shadow: true });

  const bodyTypo = getTypo(d.typography, "body-lg");
  const fontSize = 48;
  ctx.save();
  ctx.font = `400 ${fontSize}px "${bodyTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Accent bar
  ctx.fillStyle = c.primary;
  ctx.fillRect(margin, headerH + 80, 96, 8);

  ctx.fillStyle = c["on-surface"];
  const lines = wrapText(ctx, slide.text || "", SIZE - margin * 2);
  let y = headerH + 160;
  for (const line of lines) {
    if (line === "") {
      y += fontSize * 0.5;
    } else {
      ctx.fillText(line, margin, y);
      y += fontSize * 1.4;
    }
  }
  ctx.restore();
}

function renderBodyList(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;
  const headerH = 120;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 24, 0.05);
  drawStructuralBorder(ctx, 20, c["on-surface"]);

  ctx.save();
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();
  ctx.restore();

  drawBadge(ctx, d, 48, 40, "NEWSPAPPER", { shadow: true });

  const containerW = SIZE - margin * 2;
  const containerH = 600;
  const containerY = headerH + 100;
  
  drawBlockedShadow(ctx, margin, containerY, containerW, containerH, 8, 8, c["on-surface"]);
  ctx.save();
  ctx.fillStyle = c["surface-container"];
  ctx.fillRect(margin, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, containerY, containerW, containerH);
  ctx.restore();

  const bodyTypo = getTypo(d.typography, "body-lg");
  const fontSize = 42;
  ctx.save();
  ctx.font = `400 ${fontSize}px "${bodyTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  const lines = wrapText(ctx, slide.text || "", containerW - 100);
  let y = containerY + 60;
  for (const line of lines) {
    if (line === "") {
      y += fontSize * 0.5;
    } else {
      ctx.fillText(line, margin + 50, y);
      y += fontSize * 1.5;
    }
  }
  ctx.restore();
}

function renderBodyComparison(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 80;

  drawBackground(ctx, c.background);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 20, c["on-surface"]);

  const headerH = 120;
  ctx.save();
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();
  ctx.restore();

  drawBadge(ctx, d, SIZE / 2 - 110, 48, "NEWSPAPPER", { inverted: true });

  const containerW = SIZE - margin * 2;
  const containerH = 500;
  const containerY = SIZE / 2 - 200;

  ctx.save();
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(margin + 16, containerY + 16, containerW, containerH);
  ctx.restore();
  
  drawBlockedShadow(ctx, margin, containerY, containerW, containerH, 8, 8, c["on-surface"]);
  
  ctx.save();
  ctx.fillStyle = c["surface-container"];
  ctx.fillRect(margin, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, containerY, containerW, containerH);
  ctx.restore();

  const bodyTypo = getTypo(d.typography, "headline-md");
  const fontSize = 42;
  ctx.save();
  ctx.font = `700 ${fontSize}px "${bodyTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const lines = wrapText(ctx, slide.text || "", containerW - 120);
  const lineH = fontSize * 1.4;
  let y = containerY + containerH / 2 - ((lines.length - 1) * lineH) / 2;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2, y);
    y += lineH;
  }
  ctx.restore();
}

function renderQuoteClassic(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 140;

  drawBackground(ctx, c["inverse-surface"]);
  drawGridTexture(ctx, 16, 0.05);
  drawStructuralBorder(ctx, 12, c["on-background"]);

  const stripeH = 16;
  const colors = [c["surface-tint"], c.primary, c["on-primary-fixed-variant"]];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect((SIZE / 3) * i, 0, SIZE / 3, stripeH);
  }

  const containerW = SIZE - margin * 2;
  const containerH = 550;
  const containerY = SIZE / 2 - 300;
  
  drawBlockedShadow(ctx, margin, containerY, containerW, containerH, 12, 12, c["on-background"]);
  ctx.save();
  ctx.fillStyle = c.surface;
  ctx.fillRect(margin, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, containerY, containerW, containerH);
  ctx.restore();

  const quoteTypo = getTypo(d.typography, "headline-lg");
  const fontSize = 56;
  ctx.save();
  ctx.font = `800 ${fontSize}px "${quoteTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-background"];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const lines = wrapText(ctx, (slide.text || "").toUpperCase(), containerW - 100);
  const lineH = fontSize * 1.1;
  let y = containerY + containerH / 2 - ((lines.length - 1) * lineH) / 2 - 20;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2, y);
    y += lineH;
  }

  if (slide.attribution) {
    const attrFontSize = 24;
    ctx.font = `700 ${attrFontSize}px "${getTypo(d.typography, "label-bold").fontFamily}", sans-serif`;
    ctx.fillStyle = c["on-surface-variant"];
    ctx.fillText(`— ${slide.attribution.toUpperCase()}`, SIZE / 2, y + 40);
  }
  ctx.restore();
}

function renderQuoteReaction(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 20, c["on-surface"]);

  const containerW = SIZE - margin * 2;
  const containerH = 550;
  const containerY = SIZE / 2 - 250;
  
  ctx.save();
  ctx.fillStyle = c["surface-container-highest"];
  ctx.fillRect(margin, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, containerY, containerW, containerH);
  ctx.restore();

  const badgeW = 240;
  const badgeH = 54;
  const badgeX = margin + 60;
  const badgeY = containerY - 27;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 8, 8, c["on-surface"]);
  ctx.save();
  ctx.fillStyle = c.primary;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  ctx.font = `700 24px "${getTypo(d.typography, "label-bold").fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-primary"];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WAIT, WHAT?", badgeX + badgeW / 2, badgeY + badgeH / 2 + 2);
  ctx.restore();

  const fontSize = 48;
  ctx.save();
  ctx.font = `700 ${fontSize}px "${getTypo(d.typography, "headline-md").fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  const lines = wrapText(ctx, slide.text || "", containerW - 120);
  let y = containerY + 80;
  for (const line of lines) {
    ctx.fillText(line, margin + 60, y);
    y += fontSize * 1.3;
  }

  if (slide.attribution) {
    ctx.font = `700 22px "${getTypo(d.typography, "label-bold").fontFamily}", sans-serif`;
    ctx.fillStyle = c["on-surface-variant"];
    ctx.fillText(`— ${slide.attribution.toUpperCase()}`, margin + 60, y + 40);
  }
  ctx.restore();
}

function renderQuotePullout(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;

  drawBackground(ctx, c["primary-container"]);
  drawGridTexture(ctx, 40, 0.05);
  drawStructuralBorder(ctx, 16, c["on-surface"]);

  const topBarH = 100;
  ctx.save();
  ctx.strokeStyle = c.surface;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, topBarH);
  ctx.lineTo(SIZE, topBarH);
  ctx.moveTo(0, SIZE - topBarH);
  ctx.lineTo(SIZE, SIZE - topBarH);
  ctx.stroke();
  ctx.restore();

  const displayTypo = getTypo(d.typography, "display");
  const fontSize = 84;
  ctx.save();
  ctx.font = `800 ${fontSize}px "${displayTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const lines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - 200);
  const lineH = fontSize * 1.05;
  let startY = SIZE / 2 - ((lines.length - 1) * lineH) / 2;

  ctx.fillStyle = c["on-surface"];
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2 + 6, y + 6);
    y += lineH;
  }

  ctx.fillStyle = c.surface;
  y = startY;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2, y);
    y += lineH;
  }

  if (slide.attribution) {
    ctx.font = `700 24px "${getTypo(d.typography, "label-bold").fontFamily}", sans-serif`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(slide.attribution.toUpperCase(), SIZE / 2, y + 60);
    ctx.globalAlpha = 1.0;
  }
  ctx.restore();
}

// ===== EXPORTED CLASS =====

export class ScreenshotRenderer {
  private fontsLoaded = false;

  async init(): Promise<void> {
    if (this.fontsLoaded) return;
    const fontPaths = await ensureFonts();
    for (const { family, path } of fontPaths) {
      GlobalFonts.registerFromPath(path, family);
    }
    this.fontsLoaded = true;
  }

  async close(): Promise<void> {}

  async renderSlides(slides: Slide[], designName: string, outputDir: string): Promise<string[]> {
    await this.init();
    const slidesDir = join(outputDir, "slides");
    await mkdir(slidesDir, { recursive: true });
    const design = (await designLoader.load(designName)) as DesignTokens;
    const outputPaths: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const outputPath = join(slidesDir, `${String(i + 1).padStart(2, "0")}-${slide.type}.png`);
      const canvas = createCanvas(SIZE, SIZE);
      const ctx = canvas.getContext("2d");

      switch (slide.type) {
        case "title-main": renderTitleMain(ctx, slide, design); break;
        case "title-question": renderTitleQuestion(ctx, slide, design); break;
        case "title-statement": renderTitleStatement(ctx, slide, design); break;
        case "body-text": renderBodyText(ctx, slide, design); break;
        case "body-list": renderBodyList(ctx, slide, design); break;
        case "body-comparison": renderBodyComparison(ctx, slide, design); break;
        case "quote-classic": renderQuoteClassic(ctx, slide, design); break;
        case "quote-reaction": renderQuoteReaction(ctx, slide, design); break;
        case "quote-pullout": renderQuotePullout(ctx, slide, design); break;
        default: renderBodyText(ctx, slide, design);
      }

      const pngBuf = await canvas.encode("png");
      const compressed = await sharp(pngBuf).png({ compressionLevel: 9 }).toBuffer();
      await writeFile(outputPath, compressed);
      outputPaths.push(outputPath);
    }
    return outputPaths;
  }
}

export const screenshotRenderer = new ScreenshotRenderer();

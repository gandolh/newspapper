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

function drawBackground(ctx: SKRSContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawGridTexture(ctx: SKRSContext2D, gridSize = 32, opacity = 0.05, lightGrid = false) {
  const color = lightGrid ? `rgba(255, 255, 255, ${opacity})` : `rgba(27, 28, 28, ${opacity})`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x < SIZE; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SIZE);
    ctx.stroke();
  }
  for (let y = 0; y < SIZE; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
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
  ctx.fillStyle = color;
  ctx.fillRect(x + offsetX, y + offsetY, w, h);
}

function drawStructuralBorder(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  borderWidth = 20,
  color = "#1b1c1c"
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x + borderWidth / 2, y + borderWidth / 2, w - borderWidth, h - borderWidth);
}

// ===== TITLE RENDERERS =====

function renderTitleMain(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;
  const borderWidth = 20;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Badge with blocked shadow
  const badgeX = margin;
  const badgeY = margin;
  const badgeW = 220;
  const badgeH = 44;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 8, 8, c["on-surface"]);
  ctx.fillStyle = c.primary;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-primary"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Title text at bottom
  const displayTypo = getTypo(d.typography, "display");
  ctx.font = `800 96px "${displayTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  
  const titleLines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - margin * 2);
  let titleY = SIZE - margin - (titleLines.length * 100);
  for (const line of titleLines) {
    ctx.fillText(line, margin, titleY);
    titleY += 100;
  }

  // Accent bars at bottom right
  const barX = SIZE - margin - 64;
  const barY = SIZE - margin - 50;
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(barX, barY, 64, 4);
  ctx.fillRect(barX + 32, barY + 12, 32, 4);
}

function renderTitleQuestion(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;
  const borderWidth = 20;

  drawBackground(ctx, c.primary);
  drawGridTexture(ctx, 32, 0.05, true);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Badge at top right
  const badgeX = SIZE - 80 - 220;
  const badgeY = 80;
  const badgeW = 220;
  const badgeH = 44;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 8, 8, c["on-surface"]);
  ctx.fillStyle = c.surface;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Centered title with text shadow
  const displayTypo = getTypo(d.typography, "display");
  ctx.font = `800 120px "${displayTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  
  const titleLines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - margin * 2);
  let titleY = SIZE / 2 - (titleLines.length * 110) / 2 + 110;
  
  // Text shadow
  ctx.fillStyle = c["on-surface"];
  for (const line of titleLines) {
    ctx.fillText(line, SIZE / 2 + 6, titleY + 6);
    titleY += 110;
  }
  
  // Main text
  ctx.fillStyle = c["on-primary"];
  titleY = SIZE / 2 - (titleLines.length * 110) / 2 + 110;
  for (const line of titleLines) {
    ctx.fillText(line, SIZE / 2, titleY);
    titleY += 110;
  }
}

function renderTitleStatement(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 100;
  const borderWidth = 20;

  drawBackground(ctx, c["primary-container"]);
  drawGridTexture(ctx, 40, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Badge at top left
  const badgeX = margin;
  const badgeY = margin;
  const badgeW = 220;
  const badgeH = 44;
  ctx.fillStyle = c.surface;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 2;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Title wrapper with left border
  const wrapperX = margin;
  const wrapperY = SIZE / 2 - 150;
  const wrapperW = SIZE - margin * 2;
  const wrapperH = 300;
  
  ctx.fillStyle = "rgba(27, 28, 28, 0.1)";
  ctx.fillRect(wrapperX + 20, wrapperY, wrapperW - 20, wrapperH);
  
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(wrapperX, wrapperY, 20, wrapperH);

  // Title text with shadow
  const displayTypo = getTypo(d.typography, "display");
  ctx.font = `800 110px "${displayTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "left";
  
  const titleLines = wrapText(ctx, (slide.text || "").toUpperCase(), wrapperW - 80);
  let titleY = wrapperY + 80;
  
  // Text shadow
  ctx.fillStyle = c["on-surface"];
  for (const line of titleLines) {
    ctx.fillText(line, wrapperX + 64, titleY + 4);
    titleY += 110;
  }
  
  // Main text
  ctx.fillStyle = c.surface;
  titleY = wrapperY + 80;
  for (const line of titleLines) {
    ctx.fillText(line, wrapperX + 60, titleY);
    titleY += 110;
  }
}

// ===== BODY RENDERERS =====

function renderBodyText(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 48;
  const borderWidth = 12;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  
  // Blocked shadow for entire slide
  drawBlockedShadow(ctx, 0, 0, SIZE, SIZE, 16, 16, c["on-surface"]);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Header with badge
  const headerH = 120;
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, SIZE, headerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();

  const badgeX = margin;
  const badgeY = margin;
  const badgeW = 220;
  const badgeH = 44;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 4, 4, c["on-surface"]);
  ctx.fillStyle = c["surface-container-highest"];
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c.primary;
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Accent bar
  const barX = 100;
  const barY = headerH + 100;
  ctx.fillStyle = c.primary;
  ctx.fillRect(barX, barY, 96, 8);

  // Body text
  const bodyTypo = getTypo(d.typography, "body-lg");
  ctx.font = `400 48px "${bodyTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  
  const bodyLines = wrapText(ctx, slide.text || "", SIZE - 200);
  let bodyY = barY + 60;
  for (const line of bodyLines) {
    ctx.fillText(line, 100, bodyY);
    bodyY += 70;
  }
}

function renderBodyList(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const margin = 48;
  const borderWidth = 20;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 24, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Header
  const headerH = 120;
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, SIZE, headerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();

  const badgeX = margin;
  const badgeY = margin;
  const badgeW = 220;
  const badgeH = 44;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 4, 4, c["on-surface"]);
  ctx.fillStyle = c["surface-container-highest"];
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c.primary;
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const headlineTypo = getTypo(d.typography, "headline-md");
  ctx.font = `700 24px "${headlineTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Container with shadow
  const containerX = 100;
  const containerY = headerH + 100;
  const containerW = SIZE - 200;
  const containerH = 600;
  
  drawBlockedShadow(ctx, containerX, containerY, containerW, containerH, 8, 8, c["on-surface"]);
  ctx.fillStyle = c["surface-container"];
  ctx.fillRect(containerX, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(containerX, containerY, containerW, containerH);

  // Body text
  const bodyTypo = getTypo(d.typography, "body-lg");
  ctx.font = `400 42px "${bodyTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  
  const bodyLines = wrapText(ctx, slide.text || "", containerW - 120);
  let bodyY = containerY + 80;
  for (const line of bodyLines) {
    ctx.fillText(line, containerX + 60, bodyY);
    bodyY += 70;
  }
}

function renderBodyComparison(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const borderWidth = 20;

  drawBackground(ctx, c.background);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Header
  const headerH = 120;
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, SIZE, headerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(SIZE, headerH);
  ctx.stroke();

  const badgeX = SIZE / 2 - 110;
  const badgeY = 48;
  const badgeW = 220;
  const badgeH = 44;
  ctx.fillStyle = c["secondary-container"];
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 2;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("NEWSPAPPER", badgeX + badgeW / 2, badgeY + 28);

  // Container with double shadow
  const containerX = 80;
  const containerY = SIZE / 2 - 250;
  const containerW = SIZE - 160;
  const containerH = 500;
  
  // Outer shadow
  ctx.fillStyle = c["on-surface"];
  ctx.fillRect(containerX - 16, containerY - 16, containerW, containerH);
  
  // Inner shadow
  drawBlockedShadow(ctx, containerX, containerY, containerW, containerH, 12, 12, c["on-surface"]);
  
  ctx.fillStyle = c["surface-container"];
  ctx.fillRect(containerX, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(containerX, containerY, containerW, containerH);

  // Body text
  const headlineTypo = getTypo(d.typography, "headline-md");
  ctx.font = `700 40px "${headlineTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  
  const bodyLines = wrapText(ctx, slide.text || "", containerW - 160);
  let bodyY = containerY + containerH / 2 - (bodyLines.length * 55) / 2 + 40;
  for (const line of bodyLines) {
    ctx.fillText(line, SIZE / 2, bodyY);
    bodyY += 55;
  }
}

// ===== QUOTE RENDERERS =====

function renderQuoteClassic(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const borderWidth = 12;

  drawBackground(ctx, c["inverse-surface"]);
  drawGridTexture(ctx, 8, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-background"]);

  // Accent stripe at top
  const stripeH = 16;
  const stripeColors = [c["surface-tint"], c.primary, c["on-primary-fixed-variant"]];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = stripeColors[i];
    ctx.fillRect((SIZE / 3) * i, 0, SIZE / 3, stripeH);
  }
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, stripeH);
  ctx.lineTo(SIZE, stripeH);
  ctx.stroke();

  // Quote container
  const containerX = 140;
  const containerY = SIZE / 2 - 300;
  const containerW = SIZE - 280;
  const containerH = 600;
  
  drawBlockedShadow(ctx, containerX, containerY, containerW, containerH, 8, 8, c["on-background"]);
  ctx.fillStyle = c.surface;
  ctx.fillRect(containerX, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 4;
  ctx.strokeRect(containerX, containerY, containerW, containerH);

  // Badge
  const badgeX = SIZE / 2 - 80;
  const badgeY = containerY - 20;
  const badgeW = 160;
  const badgeH = 36;
  ctx.fillStyle = c.primary;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 2;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `700 14px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-primary"];
  ctx.textAlign = "center";
  ctx.fillText("CORE PRINCIPLE", badgeX + badgeW / 2, badgeY + 22);

  // Quote text
  const quoteTypo = getTypo(d.typography, "headline-xl");
  ctx.font = `800 64px "${quoteTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-background"];
  ctx.textAlign = "center";
  
  const quoteLines = wrapText(ctx, (slide.text || "").toUpperCase(), containerW - 160);
  let quoteY = containerY + 120;
  for (const line of quoteLines) {
    ctx.fillText(line, SIZE / 2, quoteY);
    quoteY += 70;
  }

  // Attribution
  if (slide.attribution) {
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 100, quoteY + 20);
    ctx.lineTo(SIZE / 2 + 100, quoteY + 20);
    ctx.stroke();
    
    ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
    ctx.fillStyle = c["on-surface-variant"];
    ctx.fillText((slide.attribution || "").toUpperCase(), SIZE / 2, quoteY + 60);
  }

  // Footer
  const footerY = SIZE - 80;
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, footerY, SIZE, 80);
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(SIZE, footerY);
  ctx.stroke();
  
  ctx.font = `700 14px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-background"];
  ctx.textAlign = "left";
  ctx.fillText("NEWSPAPPER INDUSTRIAL", 48, footerY + 40);
  
  ctx.fillStyle = c.primary;
  ctx.fillRect(SIZE - 80, footerY + 20, 16, 16);
  ctx.strokeStyle = c["on-background"];
  ctx.lineWidth = 2;
  ctx.strokeRect(SIZE - 80, footerY + 20, 16, 16);
}

function renderQuoteReaction(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const borderWidth = 20;

  drawBackground(ctx, c.surface);
  drawGridTexture(ctx, 32, 0.05);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Container
  const containerX = 100;
  const containerY = SIZE / 2 - 300;
  const containerW = SIZE - 200;
  const containerH = 600;
  
  ctx.fillStyle = c["surface-container-highest"];
  ctx.fillRect(containerX, containerY, containerW, containerH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(containerX, containerY, containerW, containerH);

  // Reaction badge
  const badgeX = containerX + 80;
  const badgeY = containerY - 30;
  const badgeW = 200;
  const badgeH = 48;
  drawBlockedShadow(ctx, badgeX, badgeY, badgeW, badgeH, 8, 8, c["on-surface"]);
  ctx.fillStyle = c.primary;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 4;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `800 24px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-primary"];
  ctx.textAlign = "center";
  ctx.fillText("WAIT, WHAT?", badgeX + badgeW / 2, badgeY + 32);

  // Quote text
  const quoteTypo = getTypo(d.typography, "headline-md");
  ctx.font = `700 48px "${quoteTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "left";
  
  const quoteLines = wrapText(ctx, slide.text || "", containerW - 160);
  let quoteY = containerY + 100;
  for (const line of quoteLines) {
    ctx.fillText(line, containerX + 80, quoteY);
    quoteY += 62;
  }

  // Attribution
  if (slide.attribution) {
    quoteY += 30;
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(containerX + 80, quoteY);
    ctx.lineTo(containerX + containerW - 80, quoteY);
    ctx.stroke();
    
    ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
    ctx.fillStyle = c["on-surface-variant"];
    ctx.fillText((slide.attribution || "").toUpperCase(), containerX + 80, quoteY + 40);
  }
}

function renderQuotePullout(ctx: SKRSContext2D, slide: Slide, d: DesignTokens) {
  const c = d.colors;
  const borderWidth = 16;

  drawBackground(ctx, c["primary-container"]);
  drawGridTexture(ctx, 40, 0.05);
  
  // Blocked shadow for entire slide
  drawBlockedShadow(ctx, 0, 0, SIZE, SIZE, 12, 12, c["on-surface"]);
  drawStructuralBorder(ctx, 0, 0, SIZE, SIZE, borderWidth, c["on-surface"]);

  // Top bar
  const topBarH = 100;
  ctx.strokeStyle = c.surface;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, topBarH);
  ctx.lineTo(SIZE, topBarH);
  ctx.stroke();
  
  const labelTypo = getTypo(d.typography, "label-bold");
  ctx.font = `700 14px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c.surface;
  ctx.textAlign = "left";
  ctx.fillText("INDEX // 01", 48, 60);
  
  const badgeX = SIZE - 48 - 140;
  const badgeY = 48;
  const badgeW = 140;
  const badgeH = 32;
  ctx.fillStyle = c.surface;
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = c["on-surface"];
  ctx.lineWidth = 3;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  
  ctx.fillStyle = c["on-surface"];
  ctx.textAlign = "center";
  ctx.fillText("QUOTE.REF", badgeX + badgeW / 2, badgeY + 20);

  // Quote text with shadow
  const quoteTypo = getTypo(d.typography, "headline-xl");
  ctx.font = `800 88px "${quoteTypo.fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  
  const quoteLines = wrapText(ctx, (slide.text || "").toUpperCase(), SIZE - 200);
  let quoteY = SIZE / 2 - (quoteLines.length * 95) / 2 + 88;
  
  // Text shadow
  ctx.fillStyle = c["on-surface"];
  for (const line of quoteLines) {
    ctx.fillText(line, SIZE / 2 + 6, quoteY + 6);
    quoteY += 95;
  }
  
  // Main text
  ctx.fillStyle = c.surface;
  quoteY = SIZE / 2 - (quoteLines.length * 95) / 2 + 88;
  for (const line of quoteLines) {
    ctx.fillText(line, SIZE / 2, quoteY);
    quoteY += 95;
  }

  // Attribution
  if (slide.attribution) {
    quoteY += 30;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 150, quoteY);
    ctx.lineTo(SIZE / 2 + 150, quoteY);
    ctx.stroke();
    
    ctx.font = `800 20px "${labelTypo.fontFamily}", sans-serif`;
    ctx.fillStyle = c.surface;
    ctx.globalAlpha = 0.8;
    ctx.fillText((slide.attribution || "").toUpperCase(), SIZE / 2, quoteY + 40);
    ctx.globalAlpha = 1.0;
  }

  // Bottom bar
  const bottomBarY = SIZE - 100;
  ctx.strokeStyle = c.surface;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, bottomBarY);
  ctx.lineTo(SIZE, bottomBarY);
  ctx.stroke();
  
  ctx.font = `700 14px "${labelTypo.fontFamily}", sans-serif`;
  ctx.fillStyle = c.surface;
  ctx.textAlign = "left";
  ctx.fillText("NEWSPAPPER INDUSTRIAL", 48, bottomBarY + 50);
}

// ===== MAIN RENDERER CLASS =====

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
    // no-op
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

      // Route to appropriate renderer
      switch (slide.type) {
        case "title-main":
          renderTitleMain(ctx, slide, design);
          break;
        case "title-question":
          renderTitleQuestion(ctx, slide, design);
          break;
        case "title-statement":
          renderTitleStatement(ctx, slide, design);
          break;
        case "body-text":
          renderBodyText(ctx, slide, design);
          break;
        case "body-list":
          renderBodyList(ctx, slide, design);
          break;
        case "body-comparison":
          renderBodyComparison(ctx, slide, design);
          break;
        case "quote-classic":
          renderQuoteClassic(ctx, slide, design);
          break;
        case "quote-reaction":
          renderQuoteReaction(ctx, slide, design);
          break;
        case "quote-pullout":
          renderQuotePullout(ctx, slide, design);
          break;
        default:
          renderBodyText(ctx, slide, design);
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

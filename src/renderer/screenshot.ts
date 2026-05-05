import { chromium, Browser } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { htmlBuilder } from './html-builder.js';

interface Slide {
  type: string;
  [key: string]: unknown;
}

export class ScreenshotRenderer {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      logger.debug('Launching browser for rendering...');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async renderSlide(html: string, outputPath: string): Promise<string> {
    await this.init();

    const context = await this.browser!.newContext({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 2
    });

    const page = await context.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const screenshot = await page.screenshot({ type: 'png', fullPage: false });

      const compressed = await sharp(screenshot)
        .png({ quality: config.images.quality, compressionLevel: 9 })
        .toBuffer();

      await writeFile(outputPath, compressed);
      logger.debug(`Rendered slide: ${outputPath}`);
      return outputPath;
    } finally {
      await context.close();
    }
  }

  async renderSlides(slides: Slide[], designName: string, outputDir: string): Promise<string[]> {
    await mkdir(join(outputDir, 'slides'), { recursive: true });
    logger.info(`Rendering ${slides.length} slides...`);

    const htmlSlides = await htmlBuilder.buildAllSlides(slides, designName);
    const outputPaths: string[] = [];

    for (let i = 0; i < htmlSlides.length; i++) {
      const outputPath = join(outputDir, 'slides', `${String(i + 1).padStart(2, '0')}-${slides[i].type}.png`);
      await this.renderSlide(htmlSlides[i], outputPath);
      outputPaths.push(outputPath);
    }

    logger.success(`Rendered ${outputPaths.length} slides to ${outputDir}/slides/`);
    return outputPaths;
  }
}

export const screenshotRenderer = new ScreenshotRenderer();

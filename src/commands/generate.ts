import { readFile, stat, access } from "fs/promises";
import { join, basename } from "path";
import { screenshotRenderer } from "../renderer/screenshot.js";
import { db } from "../storage/database.js";
import { logger } from "../utils/logger.js";

interface SlidesFile {
  design: string;
  slides: Array<{
    type: string;
    text: string;
    attribution?: string;
    [key: string]: unknown;
  }>;
}

export async function generateCommand(postDir: string): Promise<void> {
  db.initialize();

  const slidesPath = join(postDir, "slides.json");

  let slidesData: SlidesFile;
  try {
    const raw = await readFile(slidesPath, "utf-8");
    slidesData = JSON.parse(raw) as SlidesFile;
  } catch {
    logger.error(`Cannot read slides.json at: ${slidesPath}`);
    logger.info('Run "npm run format" first to generate a post');
    process.exit(1);
  }

  if (!slidesData.slides || slidesData.slides.length === 0) {
    logger.error("slides.json contains no slides");
    process.exit(1);
  }

  logger.info(`Rendering ${slidesData.slides.length} slides`);
  logger.info(`Design: ${slidesData.design}`);

  // Validate templates exist
  const templatesDir = join(process.cwd(), "templates", slidesData.design);
  try {
    await access(templatesDir);
  } catch {
    logger.error(`Templates directory not found: ${templatesDir}`);
    logger.info(`Available designs: digital-broadsheet, warm-industrial`);
    process.exit(1);
  }

  // Validate each slide has a corresponding template
  const missingTemplates: string[] = [];
  for (const slide of slidesData.slides) {
    const templatePath = join(templatesDir, `${slide.type}.html`);
    try {
      await access(templatePath);
    } catch {
      missingTemplates.push(slide.type);
    }
  }

  if (missingTemplates.length > 0) {
    logger.error(
      `Missing templates for slide types: ${missingTemplates.join(", ")}`,
    );
    logger.info(`Check templates in: ${templatesDir}`);
    process.exit(1);
  }

  let imagePaths: string[];

  try {
    logger.info("Rendering slides...");
    imagePaths = await screenshotRenderer.renderSlides(
      slidesData.slides,
      slidesData.design,
      postDir,
    );
    logger.success(`Generated ${imagePaths.length} image(s)`);
  } catch (err) {
    logger.error("Image generation failed");
    logger.error((err as Error).message);
    process.exit(1);
  } finally {
    await screenshotRenderer.close();
  }

  let totalSize = 0;
  for (const p of imagePaths) {
    const s = await stat(p);
    totalSize += s.size;
  }
  logger.info(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  // Update post status in DB
  const slug = basename(postDir);
  const posts = db.getAllPosts();
  const post = posts.find((p) => p.slug === slug);
  if (post) db.updatePostStatus(post.id, "generated");

  logger.success(`Images saved to: ${postDir}/slides/`);
}

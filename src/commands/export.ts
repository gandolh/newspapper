import { join } from 'path';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { config } from '../utils/config.js';
import ora from 'ora';
import inquirer from 'inquirer';

export function resolveDestination(destination: string): string {
  if (destination.startsWith('/')) return destination;
  return join(process.cwd(), destination);
}

export function formatExportSummary(destination: string, imageFiles: string[]): string {
  const lines = [
    '\nExport complete!',
    `  Location: ${destination}`,
    `  Files: ${imageFiles.length} images + metadata`,
    '\nContents:',
    '  slides/',
    ...imageFiles.map(f => `    ${f}`),
    '  metadata.json',
    '  summary.json',
  ];
  return lines.join('\n');
}

interface ExportOptions {
  destination?: string;
}

export async function exportCommand(groupId: string, options: ExportOptions): Promise<void> {
  const group = await groupStorage.load(groupId);
  if (!group) {
    logger.error(`Group ${groupId} not found`);
    process.exit(1);
  }

  const outputDir = join(config.paths.output, groupId);
  const slidesDir = join(outputDir, 'slides');

  let imageFiles: string[];
  try {
    const files = await readdir(slidesDir);
    imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (imageFiles.length === 0) {
      logger.error('No images found to export');
      logger.info(`Run: npm run generate ${groupId}`);
      process.exit(1);
    }
    logger.info(`Found ${imageFiles.length} images to export`);
  } catch {
    logger.error(`Output directory not found: ${outputDir}`);
    logger.info(`Run: npm run generate ${groupId}`);
    process.exit(1);
  }

  let destination = options.destination;
  if (!destination) {
    const { dest } = await inquirer.prompt<{ dest: string }>([{
      type: 'input',
      name: 'dest',
      message: 'Export destination:',
      default: join(process.env.HOME ?? process.cwd(), 'Desktop', `newspapper-${groupId}`),
    }]);
    destination = dest;
  }

  destination = resolveDestination(destination);
  logger.info(`Exporting to: ${destination}`);

  await mkdir(destination, { recursive: true });
  await mkdir(join(destination, 'slides'), { recursive: true });

  const spinner = ora('Copying files...').start();

  try {
    for (const file of imageFiles!) {
      await copyFile(join(slidesDir, file), join(destination, 'slides', file));
    }

    spinner.text = 'Copying metadata...';

    await copyFile(join(outputDir, 'metadata.json'), join(destination, 'metadata.json'));

    const summaries = (await summaryStorage.getByGroup(groupId)).filter(Boolean);
    if (summaries.length > 0) {
      summaries.sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());
      await copyFile(
        join(config.paths.data, 'summaries', `${summaries[0]!.id}.json`),
        join(destination, 'summary.json')
      );
    }

    spinner.succeed('Files copied');
  } catch (error) {
    spinner.fail('Export failed');
    logger.error((error as Error).message);
    process.exit(1);
  }

  let totalSize = 0;
  const exportedSlides = await readdir(join(destination, 'slides'));
  for (const file of exportedSlides) {
    const stats = await stat(join(destination, 'slides', file));
    totalSize += stats.size;
  }
  logger.info(`Exported ${exportedSlides.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

  await manifestManager.load();
  await manifestManager.updateGroupStatus(groupId, 'published');
  const allSummaries = (await summaryStorage.getByGroup(groupId)).filter(Boolean);
  for (const summary of allSummaries) {
    await manifestManager.updateSummaryStatus(summary!.id, 'published');
  }
  logger.success('Marked as published');

  console.log(formatExportSummary(destination, imageFiles!));

  const { openFolder } = await inquirer.prompt<{ openFolder: boolean }>([{
    type: 'confirm',
    name: 'openFolder',
    message: 'Open export folder?',
    default: false,
  }]);

  if (openFolder) {
    const { exec } = await import('child_process');
    const command = process.platform === 'darwin'
      ? `open "${destination}"`
      : process.platform === 'win32'
        ? `explorer "${destination}"`
        : `xdg-open "${destination}"`;
    exec(command);
  }
}

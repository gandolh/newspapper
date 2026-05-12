import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { Ollama } from 'ollama';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';

interface Slide {
  type: 'title' | 'body' | 'quote';
  text: string;
  attribution?: string;
}

interface FormatOptions {
  entities: string;
  tone?: string;
  design?: string;
  maxSlides?: number;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildSlug(entityNames: string[]): string {
  const today = new Date().toISOString().split('T')[0];
  const entitySlug = entityNames.slice(0, 3).map(slugify).join('-');
  return `${today}-${entitySlug}`;
}

function printSlides(slides: Slide[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('GENERATED SLIDES');
  console.log('='.repeat(60));
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    console.log(`\nSlide ${i + 1}/${slides.length} [${s.type.toUpperCase()}]`);
    console.log('-'.repeat(40));
    console.log(s.text);
    if (s.attribution) console.log(`— ${s.attribution}`);
  }
  console.log('\n' + '='.repeat(60));
}

async function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function callOllama(ollama: Ollama, prompt: string): Promise<string> {
  const response = await ollama.chat({
    model: config.ollama.model,
    messages: [
      { role: 'system', content: 'You are a social media content creator. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    options: { temperature: 0.7 },
  });
  return response.message.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
}

export async function formatCommand(options: FormatOptions): Promise<void> {
  db.initialize();

  const entityNames = options.entities.split(',').map(e => e.trim()).filter(Boolean);
  if (entityNames.length === 0) {
    logger.error('No entities specified. Use --entities "Entity1,Entity2"');
    process.exit(1);
  }

  const tone = options.tone ?? 'friendly';
  const design = options.design ?? 'warm-industrial';
  const maxSlides = options.maxSlides ?? 8;

  logger.info(`Entities: ${entityNames.join(', ')}`);
  logger.info(`Tone: ${tone} | Design: ${design}`);

  // Find articles matching entities
  const articles = db.getArticlesByEntityNames(entityNames);
  if (articles.length === 0) {
    logger.error(`No articles found for entities: ${entityNames.join(', ')}`);
    logger.info('Run "npm run extract-entities" first');
    process.exit(1);
  }

  logger.info(`Found ${articles.length} article(s) for these entities`);

  // Check Ollama connection
  const spinner = ora('Connecting to Ollama...').start();
  process.on('SIGINT', () => { spinner.stop(); process.exit(0); });
  process.on('SIGTERM', () => { spinner.stop(); process.exit(0); });
  const ollama = new Ollama({ host: config.ollama.host });
  try {
    const models = await ollama.list();
    const hasModel = models.models.some(m => m.name.includes(config.ollama.model.split(':')[0]));
    if (!hasModel) {
      spinner.fail(`Model ${config.ollama.model} not found`);
      logger.error(`Available: ${models.models.map(m => m.name).join(', ')}`);
      logger.info(`Run: ollama pull ${config.ollama.model}`);
      process.exit(1);
    }
    spinner.succeed('Ollama connected');
  } catch (err) {
    spinner.fail('Cannot connect to Ollama');
    logger.error('Make sure Ollama is running: ollama serve');
    process.exit(1);
  }

  // Load prompt templates
  const previewTpl = Handlebars.compile(
    await readFile(join(config.paths.prompts, 'format-preview.hbs'), 'utf-8')
  );
  const slidesTpl = Handlebars.compile(
    await readFile(join(config.paths.prompts, 'format-slides.hbs'), 'utf-8')
  );

  const articleContext = articles.map(a => ({
    title: a.title,
    source_name: a.source_name,
    body: a.body.slice(0, 600),
  }));

  // REPL: preview loop
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let lastFeedback = '';

  console.log('\n' + '─'.repeat(60));
  console.log('POST PREVIEW MODE — type feedback or "ok" to approve, "quit" to exit');
  console.log('─'.repeat(60));

  while (true) {
    const previewSpinner = ora('Generating preview...').start();
    let preview: { title: string; description: string };

    try {
      const prompt = previewTpl({
        tone,
        entities: entityNames.join(', '),
        articles: articleContext,
        feedback: lastFeedback || null,
      });
      const raw = await callOllama(ollama, prompt);
      preview = JSON.parse(raw) as { title: string; description: string };
      previewSpinner.stop();
    } catch (err) {
      previewSpinner.fail('Preview generation failed');
      logger.error((err as Error).message);
      rl.close();
      process.exit(1);
    }

    console.log('\n┌─ PREVIEW ' + '─'.repeat(50));
    console.log(`│ Title: ${preview.title}`);
    console.log(`│`);
    console.log(`│ ${preview.description}`);
    console.log('└' + '─'.repeat(60));

    const answer = (await askQuestion(rl, '\nFeedback (or "ok" / "quit"): ')).trim();

    if (answer.toLowerCase() === 'quit' || answer.toLowerCase() === 'q') {
      logger.info('Cancelled');
      rl.close();
      process.exit(0);
    }

    if (answer.toLowerCase() === 'ok' || answer === '') {
      break;
    }

    lastFeedback = answer;
    console.log('Regenerating with your feedback...\n');
  }

  rl.close();

  // Generate full slides
  const slidesSpinner = ora('Generating slides...').start();
  let slides: Slide[];

  try {
    const prompt = slidesTpl({
      tone,
      entities: entityNames.join(', '),
      articles: articleContext,
      maxSlides,
      feedback: lastFeedback || null,
    });
    const raw = await callOllama(ollama, prompt);
    const result = JSON.parse(raw) as { slides?: Slide[] };
    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error('Invalid response: missing slides array');
    }
    slides = result.slides;
    slidesSpinner.succeed(`Generated ${slides.length} slides`);
  } catch (err) {
    slidesSpinner.fail('Slide generation failed');
    logger.error((err as Error).message);
    process.exit(1);
  }

  printSlides(slides);

  // Save to disk
  const slug = buildSlug(entityNames);
  const postDir = join(config.paths.output, 'posts', slug);
  await mkdir(postDir, { recursive: true });

  const slidesPath = join(postDir, 'slides.json');
  await writeFile(slidesPath, JSON.stringify({ design, tone, slides }, null, 2));

  // Record in DB
  const postId = uuidv4();
  db.insertPost({
    id: postId,
    slug,
    entities_used: JSON.stringify(entityNames),
    slides_path: slidesPath,
    design,
    tone,
    status: 'draft',
  });

  logger.success(`Saved to: ${postDir}/slides.json`);
  logger.info(`Next: npm run generate -- "${postDir}"`);
}

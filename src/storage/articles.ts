import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../utils/config.js";
import { db } from "./database.js";

const RAW_ARTICLES_DIR = join(config.paths.data, "raw-articles");

interface ArticleData {
  sourceId: string;
  url: string;
  title: string;
  author?: string | null;
  publishedAt?: string;
  body: string;
  image?: string | null;
  language?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Article extends ArticleData {
  id: string;
  scrapedAt: string;
  metadata: {
    wordCount: number;
    language: string;
    [key: string]: unknown;
  };
}

export class ArticleStorage {
  async ensureDirectory(date: string, sourceId: string): Promise<string> {
    const dir = join(RAW_ARTICLES_DIR, date, sourceId);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  getDateString(date?: Date): string {
    const d = date || new Date();
    return d.toISOString().split("T")[0];
  }

  async save(articleData: ArticleData): Promise<Article> {
    const existing = db.getArticleByUrl(articleData.url);
    if (existing) {
      return existing as unknown as Article;
    }

    const scrapedAt = new Date().toISOString();
    const dateStr = this.getDateString(new Date(scrapedAt));
    const articleId = uuidv4();

    const dir = await this.ensureDirectory(dateStr, articleData.sourceId);
    const rawFilePath = join(dir, `${articleId}.json`);

    const article: Article = {
      id: articleId,
      sourceId: articleData.sourceId,
      url: articleData.url,
      title: articleData.title,
      author: articleData.author || null,
      publishedAt: articleData.publishedAt || scrapedAt,
      scrapedAt,
      body: articleData.body,
      image: articleData.image || null,
      metadata: {
        wordCount: articleData.body ? articleData.body.split(/\s+/).length : 0,
        language: articleData.language || "en",
        ...articleData.metadata,
      },
    };

    await writeFile(rawFilePath, JSON.stringify(article, null, 2));

    db.insertArticle({
      id: article.id,
      source_id: articleData.sourceId,
      source_name: (articleData as any).sourceName || articleData.sourceId,
      url: article.url,
      title: article.title,
      author: article.author ?? null,
      published_at: article.publishedAt ?? null,
      scraped_at: article.scrapedAt,
      body: article.body,
      image: article.image ?? null,
      raw_file_path: rawFilePath,
      language: article.metadata.language,
      word_count: article.metadata.wordCount,
      status: "scraped",
      group_id: null,
    });

    return article;
  }

  async load(articleId: string): Promise<Article | null> {
    const dbArticle = db.getArticleById(articleId);
    if (!dbArticle) {
      return null;
    }

    try {
      const data = await readFile(dbArticle.raw_file_path, "utf-8");
      return JSON.parse(data) as Article;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async loadMultiple(articleIds: string[]): Promise<Article[]> {
    const articles = await Promise.all(articleIds.map((id) => this.load(id)));
    return articles.filter((a): a is Article => a !== null);
  }

  async delete(articleId: string): Promise<boolean> {
    const dbArticle = db.getArticleById(articleId);
    if (!dbArticle) {
      return false;
    }

    const { unlink } = await import("fs/promises");

    try {
      await unlink(dbArticle.raw_file_path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    db.deleteArticle(articleId);
    return true;
  }

  async update(articleId: string, updates: Partial<Article>): Promise<Article> {
    const article = await this.load(articleId);
    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    const updatedArticle = { ...article, ...updates };
    const dbArticle = db.getArticleById(articleId);
    if (dbArticle) {
      await writeFile(
        dbArticle.raw_file_path,
        JSON.stringify(updatedArticle, null, 2),
      );
    }

    return updatedArticle;
  }

  async getByDate(date: string): Promise<Article[]> {
    const dbArticles = db.getArticlesByDate(date);
    return Promise.all(dbArticles.map((a) => this.load(a.id))).then(
      (articles) => articles.filter((a): a is Article => a !== null),
    );
  }

  async getBySource(sourceId: string): Promise<Article[]> {
    const dbArticles = db.getArticlesBySource(sourceId);
    return Promise.all(dbArticles.map((a) => this.load(a.id))).then(
      (articles) => articles.filter((a): a is Article => a !== null),
    );
  }

  async getAll(): Promise<Article[]> {
    const dbArticles = db.getAllArticles();
    return Promise.all(dbArticles.map((a) => this.load(a.id))).then(
      (articles) => articles.filter((a): a is Article => a !== null),
    );
  }
}

export const articleStorage = new ArticleStorage();

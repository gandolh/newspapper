import Database from "better-sqlite3";
import { join } from "path";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const DB_PATH = join(config.paths.data, "newspapper.db");

export interface Article {
  id: string;
  source_id: string;
  source_name: string;
  url: string;
  title: string;
  author: string | null;
  published_at: string | null;
  scraped_at: string;
  body: string;
  status: string;
}

export interface Entity {
  id: number;
  entity_type: string;
  entity_value: string;
}

export interface Post {
  id: string;
  slug: string;
  entities_used: string;
  slides_path: string;
  design: string;
  status: string;
  created_at: string;
}

export class DatabaseManager {
  private db: Database.Database | null = null;

  getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(DB_PATH);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
    }
    return this.db;
  }

  initialize(): void {
    const db = this.getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT,
        published_at TEXT,
        scraped_at TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'scraped'
      );

      CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
      CREATE INDEX IF NOT EXISTS idx_articles_scraped_at ON articles(scraped_at);
      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_value TEXT NOT NULL,
        UNIQUE(entity_type, entity_value)
      );

      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_value ON entities(entity_value);

      CREATE TABLE IF NOT EXISTS article_entities (
        article_id TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        PRIMARY KEY (article_id, entity_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ae_article ON article_entities(article_id);
      CREATE INDEX IF NOT EXISTS idx_ae_entity ON article_entities(entity_id);

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        entities_used TEXT NOT NULL,
        slides_path TEXT NOT NULL,
        design TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Handle legacy 'tone' column
    const tableInfo = db.prepare("PRAGMA table_info(posts)").all() as any[];
    const hasTone = tableInfo.some((col) => col.name === "tone");
    if (hasTone) {
      logger.info("Dropping legacy 'tone' column from posts table...");
      db.exec(`
        ALTER TABLE posts RENAME TO posts_old;
        CREATE TABLE posts (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL,
          entities_used TEXT NOT NULL,
          slides_path TEXT NOT NULL,
          design TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO posts (id, slug, entities_used, slides_path, design, status, created_at)
        SELECT id, slug, entities_used, slides_path, design, status, created_at FROM posts_old;
        DROP TABLE posts_old;
      `);
      logger.success("Database schema updated successfully");
    }

    logger.debug("Database initialized");
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // --- Articles ---

  insertArticle(article: Omit<Article, "status">): void {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR IGNORE INTO articles
        (id, source_id, source_name, url, title, author, published_at, scraped_at, body, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')
    `,
    ).run(
      article.id,
      article.source_id,
      article.source_name,
      article.url,
      article.title,
      article.author,
      article.published_at,
      article.scraped_at,
      article.body,
    );
  }

  getArticlesByContent(names: string[]): Article[] {
    const db = this.getDb();
    const conditions = names
      .map(() => "(title LIKE ? OR body LIKE ?)")
      .join(" OR ");
    const params = names.flatMap((n) => [`%${n}%`, `%${n}%`]);

    return db
      .prepare(
        `
      SELECT * FROM articles 
      WHERE ${conditions}
      ORDER BY scraped_at DESC
    `,
      )
      .all(...params) as Article[];
  }

  getArticleByUrl(url: string): Article | null {
    return this.getDb()
      .prepare("SELECT * FROM articles WHERE url = ?")
      .get(url) as Article | null;
  }

  getArticleById(id: string): Article | null {
    return this.getDb()
      .prepare("SELECT * FROM articles WHERE id = ?")
      .get(id) as Article | null;
  }

  getAllArticles(): Article[] {
    return this.getDb()
      .prepare("SELECT * FROM articles ORDER BY scraped_at DESC")
      .all() as Article[];
  }

  getArticlesToday(): Article[] {
    return this.getDb()
      .prepare(
        "SELECT * FROM articles WHERE DATE(scraped_at) = DATE('now') ORDER BY scraped_at DESC",
      )
      .all() as Article[];
  }

  getArticlesByStatus(status: string): Article[] {
    return this.getDb()
      .prepare(
        "SELECT * FROM articles WHERE status = ? ORDER BY scraped_at DESC",
      )
      .all(status) as Article[];
  }

  updateArticleStatus(id: string, status: string): void {
    this.getDb()
      .prepare("UPDATE articles SET status = ? WHERE id = ?")
      .run(status, id);
  }

  deleteArticle(id: string): void {
    this.getDb().prepare("DELETE FROM articles WHERE id = ?").run(id);
  }

  deleteArticlesOlderThan(cutoffIso: string): number {
    const result = this.getDb()
      .prepare("DELETE FROM articles WHERE scraped_at < ?")
      .run(cutoffIso);
    return result.changes;
  }

  // --- Entities ---

  upsertEntity(type: string, value: string): number {
    const db = this.getDb();
    const existing = db
      .prepare(
        "SELECT id FROM entities WHERE entity_type = ? AND entity_value = ?",
      )
      .get(type, value) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = db
      .prepare("INSERT INTO entities (entity_type, entity_value) VALUES (?, ?)")
      .run(type, value);
    return result.lastInsertRowid as number;
  }

  linkArticleEntity(articleId: string, entityId: number): void {
    this.getDb()
      .prepare(
        "INSERT OR IGNORE INTO article_entities (article_id, entity_id) VALUES (?, ?)",
      )
      .run(articleId, entityId);
  }

  getEntitiesByArticle(articleId: string): Entity[] {
    return this.getDb()
      .prepare(
        `
      SELECT e.* FROM entities e
      JOIN article_entities ae ON e.id = ae.entity_id
      WHERE ae.article_id = ?
      ORDER BY e.entity_type, e.entity_value
    `,
      )
      .all(articleId) as Entity[];
  }

  getArticlesByEntityNames(names: string[]): Article[] {
    const db = this.getDb();
    const placeholders = names.map(() => "?").join(",");
    const lowerNames = names.map((n) => n.toLowerCase());
    return db
      .prepare(
        `
      SELECT DISTINCT a.* FROM articles a
      JOIN article_entities ae ON a.id = ae.article_id
      JOIN entities e ON ae.entity_id = e.id
      WHERE LOWER(e.entity_value) IN (${placeholders})
      ORDER BY a.scraped_at DESC
    `,
      )
      .all(...lowerNames) as Article[];
  }

  getAllEntities(type?: string): Entity[] {
    if (type) {
      return this.getDb()
        .prepare(
          "SELECT * FROM entities WHERE entity_type = ? ORDER BY entity_value",
        )
        .all(type) as Entity[];
    }
    return this.getDb()
      .prepare("SELECT * FROM entities ORDER BY entity_type, entity_value")
      .all() as Entity[];
  }

  // --- Posts ---

  insertPost(post: Omit<Post, "created_at">): void {
    this.getDb()
      .prepare(
        `
      INSERT INTO posts (id, slug, entities_used, slides_path, design, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        post.id,
        post.slug,
        post.entities_used,
        post.slides_path,
        post.design,
        post.status,
      );
  }

  updatePostStatus(id: string, status: string): void {
    this.getDb()
      .prepare("UPDATE posts SET status = ? WHERE id = ?")
      .run(status, id);
  }

  getAllPosts(): Post[] {
    return this.getDb()
      .prepare("SELECT * FROM posts ORDER BY created_at DESC")
      .all() as Post[];
  }

  deletePostsOlderThan(cutoffIso: string): number {
    const result = this.getDb()
      .prepare("DELETE FROM posts WHERE created_at < ?")
      .run(cutoffIso);
    return result.changes;
  }

  purgeAll(): void {
    const db = this.getDb();
    db.exec(
      "DELETE FROM article_entities; DELETE FROM entities; DELETE FROM articles; DELETE FROM posts;",
    );
  }
}

export const db = new DatabaseManager();

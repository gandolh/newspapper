import Database from 'better-sqlite3';
import { join } from 'path';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const DB_PATH = join(config.paths.data, 'newspapper.db');

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
  image: string | null;
  raw_file_path: string;
  language: string;
  word_count: number;
  status: string;
  group_id: string | null;
}

export interface Entity {
  id: number;
  article_id: string;
  entity_type: string;
  entity_value: string;
  confidence: number;
  context: string | null;
  extracted_at: string;
}

export interface ArticleEntity {
  article_id: string;
  entity_id: number;
}

export class DatabaseManager {
  private db: Database.Database | null = null;

  getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
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
        image TEXT,
        raw_file_path TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        word_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scraped',
        group_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
      CREATE INDEX IF NOT EXISTS idx_articles_scraped_at ON articles(scraped_at);
      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
      CREATE INDEX IF NOT EXISTS idx_articles_group_id ON articles(group_id);
      CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);

      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_value TEXT NOT NULL,
        normalized_value TEXT NOT NULL,
        first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        occurrence_count INTEGER DEFAULT 1,
        UNIQUE(entity_type, normalized_value)
      );

      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_normalized ON entities(normalized_value);
      CREATE INDEX IF NOT EXISTS idx_entities_type_normalized ON entities(entity_type, normalized_value);

      CREATE TABLE IF NOT EXISTS article_entities (
        article_id TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        confidence REAL DEFAULT 1.0,
        context TEXT,
        extracted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (article_id, entity_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_article_entities_article ON article_entities(article_id);
      CREATE INDEX IF NOT EXISTS idx_article_entities_entity ON article_entities(entity_id);

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        threshold REAL NOT NULL,
        method TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        summary_id TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
      CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

      CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        method TEXT NOT NULL,
        tone TEXT NOT NULL,
        design TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_summaries_group_id ON summaries(group_id);
      CREATE INDEX IF NOT EXISTS idx_summaries_status ON summaries(status);
    `);

    logger.debug('Database initialized');
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  insertArticle(article: Omit<Article, 'created_at' | 'updated_at'>): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO articles (
        id, source_id, source_name, url, title, author, published_at,
        scraped_at, body, image, raw_file_path, language, word_count, status, group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      article.id,
      article.source_id,
      article.source_name,
      article.url,
      article.title,
      article.author,
      article.published_at,
      article.scraped_at,
      article.body,
      article.image,
      article.raw_file_path,
      article.language,
      article.word_count,
      article.status,
      article.group_id
    );
  }

  getArticleById(id: string): Article | null {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
    return stmt.get(id) as Article | null;
  }

  getArticleByUrl(url: string): Article | null {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM articles WHERE url = ?');
    return stmt.get(url) as Article | null;
  }

  getAllArticles(): Article[] {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM articles ORDER BY scraped_at DESC');
    return stmt.all() as Article[];
  }

  getArticlesByDate(date: string): Article[] {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT * FROM articles 
      WHERE DATE(scraped_at) = DATE(?) 
      ORDER BY scraped_at DESC
    `);
    return stmt.all(date) as Article[];
  }

  getArticlesBySource(sourceId: string): Article[] {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM articles WHERE source_id = ? ORDER BY scraped_at DESC');
    return stmt.all(sourceId) as Article[];
  }

  insertEntity(entityType: string, entityValue: string, normalizedValue: string): number {
    const db = this.getDb();
    
    const existing = db.prepare(
      'SELECT id FROM entities WHERE entity_type = ? AND normalized_value = ?'
    ).get(entityType, normalizedValue) as { id: number } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE entities 
        SET last_seen = CURRENT_TIMESTAMP, occurrence_count = occurrence_count + 1
        WHERE id = ?
      `).run(existing.id);
      return existing.id;
    }

    const result = db.prepare(`
      INSERT INTO entities (entity_type, entity_value, normalized_value)
      VALUES (?, ?, ?)
    `).run(entityType, entityValue, normalizedValue);

    return result.lastInsertRowid as number;
  }

  linkArticleEntity(articleId: string, entityId: number, confidence: number, context: string | null): void {
    const db = this.getDb();
    db.prepare(`
      INSERT OR IGNORE INTO article_entities (article_id, entity_id, confidence, context)
      VALUES (?, ?, ?, ?)
    `).run(articleId, entityId, confidence, context);
  }

  getEntitiesByArticle(articleId: string): Array<Entity & { entity_value: string; entity_type: string }> {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT e.*, ae.confidence, ae.context, ae.extracted_at
      FROM entities e
      JOIN article_entities ae ON e.id = ae.entity_id
      WHERE ae.article_id = ?
    `);
    return stmt.all(articleId) as Array<Entity & { entity_value: string; entity_type: string }>;
  }

  getArticlesByEntity(entityType: string, entityValue: string): Article[] {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT a.*
      FROM articles a
      JOIN article_entities ae ON a.id = ae.article_id
      JOIN entities e ON ae.entity_id = e.id
      WHERE e.entity_type = ? AND e.normalized_value = ?
      ORDER BY a.scraped_at DESC
    `);
    return stmt.all(entityType, entityValue.toLowerCase()) as Article[];
  }

  searchEntities(entityType?: string, searchTerm?: string, limit: number = 50): Array<{
    id: number;
    entity_type: string;
    entity_value: string;
    occurrence_count: number;
    first_seen: string;
    last_seen: string;
  }> {
    const db = this.getDb();
    let query = 'SELECT * FROM entities WHERE 1=1';
    const params: any[] = [];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (searchTerm) {
      query += ' AND normalized_value LIKE ?';
      params.push(`%${searchTerm.toLowerCase()}%`);
    }

    query += ' ORDER BY occurrence_count DESC, last_seen DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params) as Array<{
      id: number;
      entity_type: string;
      entity_value: string;
      occurrence_count: number;
      first_seen: string;
      last_seen: string;
    }>;
  }

  updateArticleStatus(articleId: string, status: string): void {
    const db = this.getDb();
    db.prepare('UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, articleId);
  }

  updateArticleGroupId(articleId: string, groupId: string | null): void {
    const db = this.getDb();
    db.prepare('UPDATE articles SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(groupId, articleId);
  }

  deleteArticle(articleId: string): void {
    const db = this.getDb();
    db.prepare('DELETE FROM articles WHERE id = ?').run(articleId);
  }

  getArticleStats(): {
    total: number;
    by_status: Record<string, number>;
    by_source: Record<string, number>;
  } {
    const db = this.getDb();
    
    const total = (db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number }).count;
    
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM articles GROUP BY status').all() as Array<{ status: string; count: number }>;
    const bySource = db.prepare('SELECT source_name, COUNT(*) as count FROM articles GROUP BY source_name').all() as Array<{ source_name: string; count: number }>;

    return {
      total,
      by_status: Object.fromEntries(byStatus.map(s => [s.status, s.count])),
      by_source: Object.fromEntries(bySource.map(s => [s.source_name, s.count]))
    };
  }
}

export const db = new DatabaseManager();

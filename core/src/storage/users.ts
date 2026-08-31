import type { DB } from './db.js';
import type { User, UserRecord } from '../types.js';

interface UserDbRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

function rowToUser(r: UserDbRow): User {
  return { id: r.id, username: r.username, createdAt: r.created_at };
}

function rowToRecord(r: UserDbRow): UserRecord {
  return { ...rowToUser(r), passwordHash: r.password_hash };
}

/** Hashing is the caller's job — storage never sees a plaintext password. */
export function createUser(db: DB, username: string, passwordHash: string): User {
  const now = new Date().toISOString();
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) throw new Error(`User "${username}" already exists`);
  const r = db
    .prepare(
      `INSERT INTO users (username, password_hash, created_at)
       VALUES (@username, @password_hash, @created_at)`,
    )
    .run({ username, password_hash: passwordHash, created_at: now });
  return { id: Number(r.lastInsertRowid), username, createdAt: now };
}

/** Includes the stored hash — for password verification only. */
export function findUserByUsername(db: DB, username: string): UserRecord | undefined {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
    | UserDbRow
    | undefined;
  return row ? rowToRecord(row) : undefined;
}

export function findUser(db: DB, id: number): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserDbRow | undefined;
  return row ? rowToUser(row) : undefined;
}

export function listUsers(db: DB): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all() as UserDbRow[];
  return rows.map(rowToUser);
}

export function countUsers(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

export function setUserPassword(db: DB, id: number, passwordHash: string): User | undefined {
  const r = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  if (r.changes === 0) return undefined;
  return findUser(db, id);
}

export function removeUser(db: DB, id: number): User | undefined {
  const existing = findUser(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return existing;
}

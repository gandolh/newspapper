import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import {
  createUser,
  findUser,
  findUserByUsername,
  listUsers,
  countUsers,
  setUserPassword,
  removeUser,
} from './users.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-users-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('users', () => {
  it('createUser stores a hash and never returns it from findUser', () => {
    const user = createUser(db, 'cristian', 'hash-1');
    expect(user.id).toBeGreaterThan(0);
    expect(user).not.toHaveProperty('passwordHash');
    expect(findUser(db, user.id)).toEqual(user);
  });

  it('findUserByUsername returns the hash for verification', () => {
    createUser(db, 'cristian', 'hash-1');
    const record = findUserByUsername(db, 'cristian');
    expect(record!.passwordHash).toBe('hash-1');
    expect(findUserByUsername(db, 'nobody')).toBeUndefined();
  });

  it('usernames are unique', () => {
    createUser(db, 'cristian', 'hash-1');
    expect(() => createUser(db, 'cristian', 'hash-2')).toThrow(/already exists/);
  });

  it('countUsers drives first-run setup', () => {
    expect(countUsers(db)).toBe(0);
    createUser(db, 'cristian', 'hash-1');
    expect(countUsers(db)).toBe(1);
  });

  it('setUserPassword replaces the hash', () => {
    const user = createUser(db, 'cristian', 'hash-1');
    setUserPassword(db, user.id, 'hash-2');
    expect(findUserByUsername(db, 'cristian')!.passwordHash).toBe('hash-2');
    expect(setUserPassword(db, 9999, 'x')).toBeUndefined();
  });

  it('removeUser deletes and returns the row', () => {
    const user = createUser(db, 'cristian', 'hash-1');
    expect(removeUser(db, user.id)!.username).toBe('cristian');
    expect(listUsers(db)).toEqual([]);
    expect(removeUser(db, user.id)).toBeUndefined();
  });
});

import { countUsers, createUser } from '@newspapper/core';
import type { DB } from '@newspapper/core';
import { hashPassword, MIN_PASSWORD_LENGTH } from './password.js';
import { isDevelopmentMode } from './mode.js';

export const DEV_USERNAME = 'admin';
export const DEV_PASSWORD = 'newspapper-dev';

export interface SeedLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

const noopLogger: SeedLogger = { info: () => {}, warn: () => {} };

/**
 * First-boot only: creates the single account from ADMIN_USERNAME /
 * ADMIN_PASSWORD. Outside development, missing credentials are fatal rather
 * than a silently unprotected app.
 */
export async function seedAdminAccount(db: DB, logger: SeedLogger = noopLogger): Promise<void> {
  if (countUsers(db) > 0) return;

  const username = process.env['ADMIN_USERNAME']?.trim();
  const password = process.env['ADMIN_PASSWORD'];

  if (!username || !password) {
    if (!isDevelopmentMode()) {
      throw new Error(
        'ADMIN_USERNAME and ADMIN_PASSWORD must be set to create the first account. Refusing to start without an account.',
      );
    }
    createUser(db, DEV_USERNAME, await hashPassword(DEV_PASSWORD));
    logger.warn(
      `ADMIN_USERNAME/ADMIN_PASSWORD unset — seeded the development account "${DEV_USERNAME}". See corpus/wiki/configuration.md for the default and set your own before deploying.`,
    );
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  createUser(db, username, await hashPassword(password));
  logger.info(`Seeded the account "${username}".`);
}

/**
 * `npm run seed --workspace=api` — create the local account named by
 * `SEED_USERNAME`, `SEED_PASSWORD` and (optionally) `SEED_ROLE`, if it does not
 * exist. Run it from a shell that has those set; never write them to a file in
 * the repo. An existing account is left exactly as it is.
 */
import { createAppAccounts, seedFromEnv } from './ward/auth.js';
import { db } from './lib/db.js';

try {
  const result = await seedFromEnv(createAppAccounts(db()));
  console.log(
    `created: ${result.created.join(', ') || 'none'}; already there: ${result.existing.join(', ') || 'none'}`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}

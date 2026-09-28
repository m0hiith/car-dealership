import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAuthUser, grantAdmin, loadEnv } from './supabase-admin';

export const AUTH_FILE = path.join(__dirname, '.auth', 'e2e-admin.json');

export type E2EAuth = { email: string; password: string; userId: string; runId: string };

/**
 * Provisions a throwaway admin account for the e2e run (see tests/e2e/README.md).
 * Deleted again in global-teardown.ts, along with any test data it created.
 */
export default async function globalSetup() {
  const env = loadEnv();
  const runId = randomBytes(4).toString('hex');
  const email = `e2e-${runId}@example.invalid`;
  const password = `E2e-${randomBytes(12).toString('hex')}!`;

  const userId = await createAuthUser(env, email, password);
  await grantAdmin(env, userId);

  const auth: E2EAuth = { email, password, userId, runId };
  await mkdir(path.dirname(AUTH_FILE), { recursive: true });
  await writeFile(AUTH_FILE, JSON.stringify(auth, null, 2));
}

import { readFile, rm } from 'node:fs/promises';
import { AUTH_FILE, type E2EAuth } from './global-setup';
import { deleteAuthUser, deleteTestCars, deleteWhere, loadEnv } from './supabase-admin';

/**
 * Removes the throwaway admin account and any test data tagged with this
 * run's id, even if the spec itself failed partway through its own cleanup.
 */
export default async function globalTeardown() {
  let auth: E2EAuth;
  try {
    auth = JSON.parse(await readFile(AUTH_FILE, 'utf8')) as E2EAuth;
  } catch {
    return; // global-setup never got far enough to write it
  }

  const env = loadEnv();
  await deleteWhere(env, 'leads', 'name', `eq.E2E Lead ${auth.runId}`);
  await deleteTestCars(env, auth.runId);
  await deleteWhere(env, 'admin_users', 'user_id', `eq.${auth.userId}`);
  await deleteAuthUser(env, auth.userId);

  await rm(AUTH_FILE, { force: true });
}

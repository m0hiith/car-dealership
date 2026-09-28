// Service-role REST helpers for the e2e harness only (global setup/teardown).
// Never imported by app code or by the specs themselves.

import path from 'node:path';

export type Env = { url: string; serviceRoleKey: string };

export function loadEnv(): Env {
  process.loadEnvFile(path.join(__dirname, '..', '..', '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'e2e tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see tests/e2e/README.md).',
    );
  }
  return { url, serviceRoleKey };
}

function headers(env: Env, extra?: Record<string, string>) {
  return {
    apikey: env.serviceRoleKey,
    Authorization: `Bearer ${env.serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function ok(res: Response, action: string) {
  if (!res.ok) throw new Error(`${action} failed: HTTP ${res.status} ${await res.text()}`);
  return res;
}

/** Creates a confirmed Supabase Auth user (bypasses email verification). */
export async function createAuthUser(env: Env, email: string, password: string): Promise<string> {
  const res = await fetch(`${env.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(env),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  await ok(res, 'create auth user');
  const { id } = (await res.json()) as { id: string };
  return id;
}

export async function deleteAuthUser(env: Env, userId: string): Promise<void> {
  await fetch(`${env.url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: headers(env) });
}

export async function grantAdmin(env: Env, userId: string): Promise<void> {
  const res = await fetch(`${env.url}/rest/v1/admin_users`, {
    method: 'POST',
    headers: headers(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ user_id: userId, role: 'admin' }),
  });
  await ok(res, 'grant admin');
}

/** Deletes rows matching a PostgREST filter value, e.g. deleteWhere(env, "leads", "name", "eq.Someone"). */
export async function deleteWhere(env: Env, table: string, column: string, filter: string): Promise<void> {
  const url = new URL(`${env.url}/rest/v1/${table}`);
  url.searchParams.set(column, filter);
  await fetch(url, { method: 'DELETE', headers: headers(env, { Prefer: 'return=minimal' }) });
}

/**
 * Deletes every car whose variant starts with "E2E {runId}" (the e2e spec
 * tags its test car this way), plus their storage objects: the DB row
 * cascades to car_images, but the actual files need a separate delete.
 */
export async function deleteTestCars(env: Env, runId: string): Promise<void> {
  const url = new URL(`${env.url}/rest/v1/cars`);
  url.searchParams.set('variant', `ilike.*E2E ${runId}*`);
  url.searchParams.set('select', 'id,car_images(storage_path)');
  const res = await fetch(url, { headers: headers(env) });
  if (!res.ok) return;
  const cars = (await res.json()) as Array<{ id: string; car_images: Array<{ storage_path: string }> }>;
  const paths = cars.flatMap((c) => c.car_images.map((i) => i.storage_path));
  if (paths.length > 0) {
    await fetch(`${env.url}/storage/v1/object/car-images`, {
      method: 'DELETE',
      headers: headers(env),
      body: JSON.stringify({ prefixes: paths }),
    });
  }
  await deleteWhere(env, 'cars', 'variant', `ilike.*E2E ${runId}*`);
}

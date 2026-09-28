# End-to-end tests

`acceptance-flow.spec.ts` drives the whole acceptance test from `docs/PRODUCT_SPEC.md` §19 in a real browser against a real (dev) Supabase project: admin logs in, adds a car with a photo, publishes it, the car appears on `/cars` and its brand filter, a visitor submits a lead from the detail page, the lead shows up in `/admin/leads`, the car is marked sold, and it leaves the public listings.

## What it needs

- `.env.local` filled in (see `docs/SUPABASE_SETUP.md`), pointing at a project you are happy to run test writes against. **Do not point this at a project with real customer data** — it creates and deletes a real admin account and real rows.
- Chromium for Playwright: `npx playwright install chromium` (once).

## Running it

```bash
npm run test:e2e
```

This starts `next dev` on port 3200 and runs the spec against it. `reuseExistingServer` is off in CI and on elsewhere, so a `next dev` you already have running on 3200 is reused.

## How the admin account works

`global-setup.ts` creates a throwaway admin account directly with the service-role key (Supabase Admin Auth API + an `admin_users` insert) before the test runs, and writes its credentials to `tests/e2e/.auth/e2e-admin.json` (gitignored). `global-teardown.ts` deletes that account afterwards, along with:

- the test car (tagged `variant` starts with `E2E <run id>`, and its uploaded photo), and
- the test lead (tagged `name` = `E2E Lead <run id>`),

matched by a random run id so a crashed run never accumulates junk in the database. Teardown runs even if the spec fails partway through.

If a run is killed before teardown runs (e.g. `Ctrl+C`), the account and test data are still there — either rerun `npm run test:e2e` (a new run's teardown does not clean up an old run's tag, since the run id differs) or clean up by hand in the SQL editor:

```sql
delete from public.leads where name like 'E2E Lead %';
delete from public.cars where variant like 'E2E %';
```

and remove any `e2e-*@example.invalid` users from **Authentication → Users**.

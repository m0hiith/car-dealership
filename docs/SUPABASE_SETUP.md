# Supabase setup

How to connect this app to a Supabase project, apply the schema and make yourself an admin.

## What's in `supabase/`

| File | What it does |
|---|---|
| `migrations/20260927100000_enums_and_helpers.sql` | Enums (`car_status`, `lead_status`, `fuel_type`, `transmission`, `body_type`) and the `updated_at` trigger function |
| `migrations/20260927100100_tables.sql` | All tables, FKs, checks, indexes, triggers; creates the single `homepage_content` and `site_settings` rows |
| `migrations/20260927100200_rls.sql` | `is_admin()`, table grants and RLS policies on every table |
| `migrations/20260927100300_storage.sql` | `car-images` and `site-media` buckets and their admin-only write policies |
| `migrations/20260927110000_car_save.sql` | `save_car()` (saves a car, its features and photos in one transaction) and the rule that published/reserved cars need at least one photo |
| `migrations/20260927110100_fix_car_photo_check.sql` | Fix for the photo rule's trigger function |
| `seed.sql` | 12 brands with their models, plus 8 **sample** cars (`is_sample = true`) |

## 1. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick region **South Asia (Mumbai)**, which is closest to Hyderabad.
3. Save the database password in your password manager. The CLI asks for it.

## 2. Fill in `.env.local`

```bash
cp .env.example .env.local
```

From **Project Settings → API Keys** (the URL is under **Data API**):

- `NEXT_PUBLIC_SUPABASE_URL`: the project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the `anon` key or the `sb_publishable_…` key
- `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key or the `sb_secret_…` key. Keep it secret.

## 3. Link the CLI and push the migrations

```bash
supabase login                                  # opens the browser once
supabase link --project-ref <your-project-ref>  # the ref is in the project URL; enter the DB password
supabase db push --dry-run                      # lists the migrations it will apply
supabase db push --include-seed                 # applies them, then runs seed.sql
```

`--include-seed` is only needed the first time. Later schema changes are new files in `supabase/migrations` pushed with `npm run db:push`. Never edit a migration that has already been pushed.

No CLI? Paste each migration file into **SQL Editor** in filename order, then `seed.sql`. The CLI is better because it records which migrations have been applied.

## 4. Regenerate the TypeScript types

```bash
npm run db:types
```

This overwrites `lib/database.types.ts` from the live schema. Run it after every migration. The committed file was written to match these migrations, so the diff should be small or empty.

## 5. Turn off public sign-up

This app has admin accounts only. Go to **Authentication → Sign In / Providers**, keep **Email** enabled and switch **Allow new users to sign up** off.

## 6. Create your account and make it an admin

1. **Authentication → Users → Add user → Create new user**. Enter your email and a strong password and tick **Auto Confirm User**.
2. In **SQL Editor**, run this with your email:

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where email = 'you@example.com';
   ```

3. Check that it worked. It should return one row:

   ```sql
   select u.email, a.role
   from public.admin_users a
   join auth.users u on u.id = a.user_id;
   ```

Add more staff the same way with `role` set to `'admin'`. To revoke access, delete their row from `admin_users`. Admin rows can only be changed from the SQL Editor, so nobody can make themselves an admin through the app.

`select public.is_admin()` in the SQL Editor always returns `false`, because the editor isn't signed in as a user. The real check happens when you sign in to `/admin` (phase 3).

## 7. Dealership details (until the Settings page exists)

The migration creates `site_settings` with the placeholder name "Dealership name". Until `/admin/settings` is built in phase 8:

1. **Storage → site-media → Upload** `logo.jpg` and copy its public URL.
2. **Table Editor → site_settings**: set `dealership_name`, `logo_url`, `phone`, `whatsapp_number`, `address`, `map_url` and `business_hours`.

## 8. Before launch: remove the sample cars

```sql
delete from public.cars where is_sample;
```

This also removes their features and images. Brands and models stay.

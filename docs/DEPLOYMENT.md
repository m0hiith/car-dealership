# Deploying to Vercel

This assumes `docs/SUPABASE_SETUP.md` is done: the project exists, migrations are pushed, `lib/database.types.ts` is up to date, public sign-up is off, and you have an admin account. Do that first — a deploy with no working Supabase project just shows broken pages.

## 1. Import the project

1. [vercel.com/new](https://vercel.com/new) → import this Git repository.
2. Framework preset: **Next.js** (auto-detected). Leave the build command, output directory and install command on their defaults.
3. Don't deploy yet — add the environment variables first (below), then deploy.

## 2. Environment variables

Set these in **Project Settings → Environment Variables**. Add each to **Production** and **Preview**; add them to **Development** too if you use `vercel dev`. Values come from the same place as `.env.local` (Supabase dashboard → **Project Settings → API Keys**).

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL | Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `sb_publishable_…` key | Public. RLS protects the data behind it. |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / `sb_secret_…` key | **Secret.** Never a `NEXT_PUBLIC_` variable. Bypasses RLS — see `lib/supabase/admin.ts`. |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.in` | Optional: without it, the app falls back to the Vercel production URL (`lib/site-url.ts`). Set it once you have a custom domain, so canonical URLs, the sitemap and WhatsApp links use it instead of the `*.vercel.app` one. |
| `LEAD_EMAIL_ENABLED` | `true` or `false` | Optional. Off by default; turn on to email the owner about each new enquiry. |
| `RESEND_API_KEY` | your Resend key | **Secret.** Only needed if `LEAD_EMAIL_ENABLED=true`. |
| `LEAD_EMAIL_FROM` | e.g. `Website <leads@yourdomain.in>` | Only needed if `LEAD_EMAIL_ENABLED=true`. Must be a sender on a domain verified in Resend. |
| `LEAD_EMAIL_TO` | one or more addresses, comma-separated | Only needed if `LEAD_EMAIL_ENABLED=true`. |

Do **not** set `SUPABASE_DB_PASSWORD` here — that's only for running the Supabase CLI from your own machine (`supabase link`, `supabase db push`), never for the deployed app.

## 3. Supabase Auth: Site URL

In the Supabase dashboard → **Authentication → URL Configuration**, set **Site URL** to your production domain (the custom domain if you have one, otherwise the `*.vercel.app` URL). This app has no email links (no magic link or password-reset flow — admin accounts are managed from the SQL editor per `docs/SUPABASE_SETUP.md` §6), so there is no redirect-URL allowlist to configure beyond this.

## 4. Deploy

Trigger the deploy (push to the branch Vercel is watching, or click **Deploy**). Every push to a non-production branch gets its own preview URL with the same environment variables — useful for reviewing changes before they reach the real domain, but remember preview deploys hit the **same Supabase project** as production unless you point them at a separate one. Writes made while testing a preview are real writes.

## 5. Custom domain

1. **Project Settings → Domains** → add your domain, follow Vercel's DNS instructions (usually a CNAME or A record at your registrar).
2. Once it's verified, set `NEXT_PUBLIC_SITE_URL` (step 2) to it and redeploy.
3. Update the Supabase **Site URL** (step 3) to match.

## 6. Before going live: production checklist

- [ ] `npm run lint && npm run typecheck && npm run test` all pass.
- [ ] Sample cars removed: `delete from public.cars where is_sample;` in the SQL editor (`docs/SUPABASE_SETUP.md` §8). Confirm `/cars` no longer shows "SAMPLE LISTING" descriptions.
- [ ] `/styleguide` 404s on the deployed site (it only works under `next dev`; see `app/styleguide/page.tsx`).
- [ ] `/robots.txt` blocks `/admin` and points at `/sitemap.xml`; `/sitemap.xml` loads and lists your real cars, brands and body types.
- [ ] Supabase **Authentication → Sign In / Providers**: **Allow new users to sign up** is off.
- [ ] Every staff member who needs admin access has a row in `admin_users` (`docs/SUPABASE_SETUP.md` §6); nobody who shouldn't have access does.
- [ ] `/admin` settings and homepage content are filled in with the real dealership's details, not placeholders.
- [ ] Run the acceptance test once by hand (or `npm run test:e2e` against this project — see `tests/e2e/README.md`): add a car with a photo, publish it, see it on `/cars` and its brand page, submit an enquiry, see it in `/admin/leads`, mark the car sold, see it leave the listings.
- [ ] If `LEAD_EMAIL_ENABLED=true`, send a test enquiry and confirm the email arrives.
- [ ] Lighthouse (mobile) on `/`, `/cars` and a car detail page — target 90+.

## Rolling back

Vercel keeps every deployment. **Deployments** tab → find the last good one → **Promote to Production**. This only changes which build serves traffic; it does not touch the database, so a schema change made since then is not undone.

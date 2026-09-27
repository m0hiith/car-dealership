# CLAUDE.md

Rules for every session working in this repo. Read this first, then `docs/PRODUCT_SPEC.md` (what to build) and `docs/DESIGN.md` (how it looks).

**Order of authority:** this file → `docs/PRODUCT_SPEC.md` → `docs/DESIGN.md`. `DESIGN.md` governs visual style only; its content, copy and claims are overridden by the rules below.

---

## 1. Project

A used-car dealership platform for a pre-owned car dealer in Hyderabad. One Next.js app, two interfaces, one Supabase database:

- **Public showroom** (`/`, `/cars`, `/cars/[slug]`, `/cars/brand/[brand]`, `/cars/type/[bodyType]`, `/about`, `/contact`): customers browse, filter and enquire.
- **Private dashboard** (`/admin/*`): staff add, edit, publish, reserve and sell cars, and manage leads, testimonials, homepage content and settings.

**The database is the single source of truth.** Never hardcode vehicles, filter option lists, homepage copy, contact details, testimonials or the dealership name in components. A car published in `/admin` must show up on every relevant public listing with no code change; a car marked Sold must leave active inventory automatically.

The dealership name, logo, phone, WhatsApp number and address come from `site_settings`. `logo.jpg` in the repo is a seed asset for that table, not something to import directly into components.

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Latest stable Next.js, App Router, React Server Components by default |
| Language | TypeScript, `strict: true`, no `any` without a comment explaining why |
| Styling | Tailwind CSS (latest), tokens from §3 defined once in the theme |
| Data | Supabase Postgres, queried with `@supabase/supabase-js` and generated types (`lib/database.types.ts`) |
| Auth | Supabase Auth (email + password, admins only) via `@supabase/ssr` |
| Files | Supabase Storage (`car-images`, `site-media` buckets) |
| Mutations | Server Actions (Route Handlers only where an action does not fit) |
| Validation | zod |
| Tests | Vitest (unit), Playwright (e2e) |
| Hosting | Vercel |

Not allowed: a separate Node/Express server, MongoDB, Firebase, WordPress, Shopify, or an ORM (Prisma, Drizzle, etc.). Supabase's typed client covers this CRUD workload; adding an ORM needs a written justification and approval first. Add a dependency only when it clearly saves work, and say why.

## 3. Design rules

Font: **Plus Jakarta Sans**, loaded with `next/font/google` and exposed as a CSS variable. No other typefaces.

### Colours

| Token | Hex | Use |
|---|---|---|
| `navy` | `#0B2545` | Primary: header, nav, titles, primary buttons |
| `navy-dark` | `#091E3A` | Primary hover, admin sidebar |
| `action` | `#0284C7` | Interactive: secondary buttons, links, focus borders, filter selections |
| `highlight` | `#0EA5E9` | Accents, active states, slider rails |
| `trust` | `#16A34A` | Genuine trust signals only (see §4) |
| `trust-light` | `#22C55E` | Trust signal accents |
| `reserved` | `#F59E0B` | The Reserved badge and banner, nothing else |
| `canvas` | `#F8FAFC` | Page background |
| `card` | `#FFFFFF` | Cards, panels, inputs |
| `border` | `#E2E8F0` | Default borders |

Supporting neutrals from `DESIGN.md`: slate text `#64748B`, chip background `#F1F5F9`, chip text `#334155`, input border `#CBD5E1`, checkbox border `#94A3B8`, hover border `#BAE6FD`, focus ring `rgba(2, 132, 199, 0.15)`.

Ignore the Material-style palette in the `DESIGN.md` front matter (`surface`, `primary: #001026`, etc.). The table above is the palette.

### Radius

- Cards and containers: **16px**
- Controls (buttons, inputs, selects, dialogs): **8px**
- Chips, pills and badges: **full** (9999px)

### Elevation (exactly as in `DESIGN.md`)

- **Level 0:** canvas `#F8FAFC`, no shadow.
- **Level 1** (resting cards, filter panels): `1px solid #E2E8F0` + `0 1px 3px 0 rgba(11, 37, 69, 0.05), 0 1px 2px -1px rgba(11, 37, 69, 0.03)`
- **Level 2** (card hover, active search bar): `0 10px 25px -5px rgba(11, 37, 69, 0.08), 0 8px 10px -6px rgba(11, 37, 69, 0.04)`, border shifts to `#BAE6FD`
- **Level 3** (sticky CTA bars, modals, bottom sheets): `0 20px 25px -5px rgba(11, 37, 69, 0.12), 0 10px 10px -5px rgba(11, 37, 69, 0.06)`

Define these as `shadow-level-1/2/3` theme tokens. Do not invent other shadows.

### Typography scale

Use the `DESIGN.md` scale (`headline-xl` 44/52 800, `headline-lg` 32/40 700, `headline-md` 22/30 700, `headline-sm` 18/26 600, `body-lg` 16/24, `body-md` 14/20, `body-sm` 12/18, `label-lg/md/sm`), with the `-mobile` headline sizes below the tablet breakpoint. Prices and km use semibold or bold.

### Layout

Mobile first. Spacing in multiples of 4px. Card padding 16px, grid gap 24px. Max container width 1280px.

| Viewport | Car grid | Filters |
|---|---|---|
| Mobile (< 768px) | 1 column | Sticky `[Filter] [Sort]` bar that opens a bottom sheet |
| Tablet (768–1199px) | 2 columns | Horizontal filter chip bar |
| Desktop (≥ 1200px) | 3 columns | Sticky filter sidebar on the left |

Feel: premium, automotive, minimal, fast. Avoid heavy animation, crowded sections and generic template looks.

## 4. Content rules (these override `DESIGN.md`)

**Never show these**, in UI copy, badges, buttons, placeholders, alt text, metadata or seed data, until the dealer confirms them and they are added to "Allowed claims" below:

- "200-point inspection", "inspected", "inspection report"
- Warranty, guarantee, "certified", "assured", "Value Certified"
- EMI, loans, "EMI from …", "zero down payment"
- "5-day return" or any return policy
- "Buy Online", "Reserve Now" or any payment or deposit flow
- Favourites, saved cars or heart icons (no customer accounts exist)

**Allowed badges** are data-driven only:

| Badge | Condition |
|---|---|
| New Arrival | `published_at` within the last 14 days |
| Featured | `featured = true` |
| 1st Owner | `owners = 1` |
| Reserved | `status = 'reserved'` (amber) |

Green (`trust`) is for genuine, factual signals only, such as the 1st Owner badge or a form's success state. It is never for promotional copy.

**Why Choose Us** defaults are limited to: quality cars, transparent pricing, verified inventory, easy documentation, customer-first service. The admin can edit them.

**Formatting** (implement once in `lib/format.ts` and reuse everywhere):

- Cards and listings: `₹15.25 Lakh`; at 1 crore or more, `₹1.2 Crore`
- Detail pages: full Indian grouping, `₹15,25,000`
- Kilometres: `32,000 km` (Indian grouping, so `1,00,000 km`)
- Dates: displayed in `Asia/Kolkata`

**Originality:** the browsing model is inspired by Indian used-car sites, but do not copy Spinny's (or anyone's) branding, copy, images, icons or layouts.

**Allowed claims:** none confirmed yet.

## 5. Engineering rules

- **Server-side filtering only.** Filters, sort and pagination run in Postgres. Never fetch the whole inventory to filter in the browser. Filter and sort state lives in URL search params.
- **RLS on every table**, no exceptions. Public (anon) may read published/reserved cars and their images and features, active brands and models, published testimonials, homepage content and site settings, and may only INSERT into `leads`. Everything else requires `is_admin()`.
- **Every admin Server Action re-checks `is_admin()`.** Middleware/proxy protection alone is not enough.
- **No secrets in client code.** The service-role key lives only in server-only modules (`import 'server-only'`). Only `NEXT_PUBLIC_SUPABASE_URL` and the anon key may be public. Never commit `.env*` files except `.env.example`.
- **Validate all input with zod**: form data, search params, route params and uploads (type and size). Schemas live in `lib/validation` and are shared by client and server.
- **Lead form:** zod, honeypot field and per-IP rate limiting.
- **Never permanently delete sold cars.** Sold and published cars can only be archived. Only drafts may be hard-deleted, after confirmation.
- **Revalidate on change:** public queries are cached with tags; every admin mutation calls `revalidateTag` / `revalidatePath` for what it affects.
- **Images:** `next/image` with responsive `sizes`; `priority` on the LCP image only. Never store binaries in Postgres.
- **Slugs** are SEO-friendly and never expose database IDs.
- **Small reusable components.** Server Components by default; add `'use client'` only for interactivity, and push it to the smallest leaf. UI primitives go in `components/ui`; no page should hand-roll a button, input, badge or card.
- **Database changes** only through new files in `supabase/migrations`. Never edit an applied migration. Regenerate `lib/database.types.ts` after each schema change.
- **After every change, run lint and typecheck** (`npm run lint && npm run typecheck`) and fix what they report before moving on. Run tests where they exist.
- **Phases are sequential.** Each phase in §7 must work and be committed before the next begins.

## 6. Folder structure

```text
app/
  (public)/                 # public showroom, shares the public header/footer layout
    page.tsx                # homepage
    cars/
      page.tsx              # listing with filters, sort, load more
      [slug]/page.tsx       # detail page
      brand/[brand]/page.tsx
      type/[bodyType]/page.tsx
    about/page.tsx
    contact/page.tsx
  admin/
    login/page.tsx          # outside the authenticated layout
    (dashboard)/            # authenticated shell: navy sidebar / mobile drawer
      page.tsx              # overview
      cars/page.tsx
      cars/new/page.tsx
      cars/[id]/edit/page.tsx
      leads/page.tsx
      testimonials/page.tsx
      content/page.tsx
      settings/page.tsx
  layout.tsx                # root: font, metadata base
  sitemap.ts
  robots.ts
components/
  ui/                       # primitives: Button, Input, Select, Badge, Chip, Card, Sheet, Dialog, Skeleton
  cars/                     # CarCard, CarGrid, Gallery, SpecChips, CarBadges
  filters/                  # FilterSidebar, FilterSheet, ActiveFilterChips, SortSelect
  leads/                    # LeadForm
  admin/                    # CarForm, ImageUploader, StatusMenu, DataTable
  layout/                   # Header, Footer, MobileNav, StickyCtaBar
lib/
  supabase/
    server.ts               # server client (cookies) for RSC and actions
    client.ts               # browser client (anon key only)
    admin.ts                # service-role client, server-only
    middleware.ts           # session refresh helper
  queries/                  # read functions: cars, brands, homepage, settings, leads
  actions/                  # server actions grouped by domain (cars, leads, content...)
  validation/               # zod schemas
  auth.ts                   # requireAdmin() helper
  format.ts                 # INR, km, date formatting
  slug.ts
  database.types.ts         # generated
supabase/
  migrations/               # timestamped SQL: enums, tables, indexes, RLS, triggers, buckets
  seed.sql                  # 12 brands + models, ~8 sample cars marked as sample data
docs/
  PRODUCT_SPEC.md
  DESIGN.md
  ADMIN_GUIDE.md            # written in phase 11
tests/
  unit/                     # Vitest
  e2e/                      # Playwright
middleware.ts               # or proxy.ts, whichever the installed Next.js version uses
```

## 7. Build phases

Tick each box when the phase works end-to-end, passes lint + typecheck, and is committed.

- [x] **1. Setup:** CLAUDE.md, project scaffold, design tokens, UI primitives
- [ ] **2. Database:** schema, enums, indexes, RLS, storage buckets, seed data, generated types
- [ ] **3. Admin auth and dashboard shell**
- [ ] **4. Add/Edit car:** form and image upload
- [ ] **5. Admin inventory:** table and status management
- [ ] **6. Public `/cars`:** filters, sorting, pagination
- [ ] **7. Car detail page and lead capture**
- [ ] **8. Homepage, content management, settings, testimonials**
- [ ] **9. Leads management**
- [ ] **10. SEO and performance pass** (Lighthouse mobile 90+ on `/`, `/cars`, a detail page)
- [ ] **11. Security review, tests, Vercel deployment, `docs/ADMIN_GUIDE.md`**

Done means the acceptance test in `PRODUCT_SPEC.md` §19 passes: add and publish a 2023 BMW X1 (₹42,00,000, Petrol, Automatic, 28,000 km), see it on `/cars`, `/cars/brand/bmw` and the matching filters, submit an enquiry that appears in `/admin/leads`, mark it Sold, and see it leave all active listings.

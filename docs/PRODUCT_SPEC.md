# Product Specification — Used-Car Dealership Platform (Hyderabad)

> Place this file at `docs/PRODUCT_SPEC.md`. It is read together with `docs/DESIGN.md` and the root `CLAUDE.md`.
> Where this spec and `DESIGN.md` disagree on content or claims, **this spec wins**. `DESIGN.md` governs visual style only.

---

## 1. Product Summary

Build a production-ready used-car dealership platform for a Hyderabad-based pre-owned car seller.

This is **not** a static brochure website. It is a small inventory platform with two connected interfaces:

1. **Public customer website:** customers browse, search, filter, view and enquire about cars.
2. **Private admin dashboard:** the owner or staff add, edit, publish, reserve and sell cars without touching code.

Both interfaces share one database, which is the **single source of truth**.

**Core product rule.** When staff add and publish a car from the dashboard, it must automatically appear on the public website in all relevant listings, including all cars, its brand, fuel, transmission, body type, and featured cars if selected. No developer is involved. When the car is marked **Sold**, it automatically disappears from active inventory.

**Positioning.** This is a digital showroom, a vehicle inventory management system and a lead management system combined.

---

## 2. Objectives

### Customers must be able to

- Discover available used cars
- Search by brand or model
- Filter and sort inventory
- View detailed vehicle information and photos
- Enquire or request a test drive
- Contact the dealership via WhatsApp or phone

### Dealership staff must be able to

- Add, edit, duplicate and archive vehicles
- Upload, reorder, set primary and delete vehicle photos
- Publish or unpublish, and mark cars reserved or sold
- Choose featured cars
- View and manage customer leads
- Manage testimonials
- Edit homepage content and contact details

### Inspiration and originality

The browsing and filtering model is inspired by large Indian used-car platforms such as Spinny. **Do not copy** Spinny's branding, UI, text, images, assets or proprietary design. The dealership gets an original visual identity, defined in `DESIGN.md`.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Latest stable Next.js (App Router), TypeScript (strict) |
| Styling | Tailwind CSS with tokens from `DESIGN.md` |
| Backend | Next.js Server Actions / Route Handlers |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (admin users only), via `@supabase/ssr` |
| Storage | Supabase Storage |
| Validation | zod |
| Testing | Vitest (unit), Playwright (e2e) |
| Hosting | Vercel |
| Analytics | Google Analytics, Google Search Console (later phase) |

Do **not** introduce a separate Node server, MongoDB, Firebase, WordPress or Shopify. The system is essentially CRUD, search and filtering, image management and lead capture.

### Architecture

```text
                    VERCEL
                      │
                NEXT.JS APP
               /           \
       PUBLIC WEBSITE      ADMIN (/admin)
               \           /
                 SUPABASE
          ┌─────────┼─────────┐
      PostgreSQL  Storage    Auth
```

One codebase, one database, one deployment, two interfaces.

---

## 4. Content and Claims Rules (Mandatory)

These override anything in `DESIGN.md`.

1. **No unconfirmed claims.** Do not show "200-point inspection", warranty, "certified", "assured", EMI, "zero down payment", "5-day return", "Buy Online" or payment-based "Reserve Now" unless the dealership confirms it offers them. Add them to `CLAUDE.md` as allowed claims only after confirmation.
2. **No customer accounts or favourites.** Omit the heart/favourite icon from vehicle cards.
3. **Use only data-driven badges:**
   - **New Arrival** for cars published within the last 14 days
   - **Featured** for cars where `featured = true`
   - **1st Owner** for cars where `owners = 1`
   - **Reserved** for cars with status `reserved` (amber)
4. **Use Indian currency formatting throughout:**
   - Cards and listings show ₹ Lakh, for example `₹15.25 Lakh` (use `₹1.2 Crore` at 1 crore or above)
   - Detail pages show the full amount, for example `₹15,25,000`
   - Kilometres are shown as `32,000 km`
5. **Timezone** is Asia/Kolkata for all displayed dates.
6. **Why Choose Us** content is editable from the admin and ships with safe defaults only: quality cars, transparent pricing, verified inventory, easy documentation and customer-first service.

---

## 5. Public Website

### 5.1 Routes

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/cars` | All available cars (listing, filters, sort) |
| `/cars/[slug]` | Vehicle detail page |
| `/cars/brand/[brand]` | Brand inventory (pre-filtered listing) |
| `/cars/type/[bodyType]` | Body-type inventory (pre-filtered listing) |
| `/about` | About the dealership |
| `/contact` | Contact and location |

Later phase: SEO landing pages generated from inventory data, such as `/cars/under-10-lakh`, "Used Hyundai cars in Hyderabad" and "Automatic cars in Hyderabad". Never hand-build these pages.

### 5.2 Homepage

The homepage stays premium, minimal and short. The flow is **Trust → Inventory → Discovery → Enquiry**. All content comes from the database, with no hardcoding.

1. **Header** with logo, Buy Cars, About, Contact and a WhatsApp/Call CTA. Mobile uses a menu drawer.
2. **Hero** with an editable headline, description, CTA (default "Browse Cars") and optional image or video. It includes a brand/model search box that routes to `/cars` with params.
3. **Browse by body type** tiles for SUV, Sedan, Hatchback, MUV and Luxury.
4. **Browse by budget** chips: Under ₹5L, ₹5–10L, ₹10–20L and ₹20L+.
5. **Featured cars** where `featured = true` and the car is available, up to 6. If none are featured, fall back to the newest cars. Includes a "View all cars" button.
6. **Why Choose Us** using editable items.
7. **Dealership video**, optional, lazy-loaded, and shown only if set.
8. **Testimonials**, published ones only.
9. **Contact/location** block with phone, WhatsApp, Hyderabad address, map link and hours.
10. **Footer**.

### 5.3 Cars Listing Page (`/cars`)

This is the most important public page.

**Desktop layout** has a sticky filter sidebar on the left and results on the right: result count, sort dropdown and a 3-column card grid.

**Tablet layout** has a horizontal filter chip bar and a 2-column grid.

**Mobile layout** has a sticky bar with `[ Filter ] [ Sort ]` that opens a bottom sheet, and a 1-column card list.

**Behaviour:**

- All filter and sort state lives in **URL search params**, so it is shareable and survives the back button.
- Filtering is done **on the server or database**. Never download the whole inventory to filter in the browser.
- Results show `published` and `reserved` cars. Reserved cars carry an amber badge and sort after available cars.
- Active filters appear as removable chips with a "Clear all" option.
- Results are paginated with "Load more", 20 per page, keeping the URL in sync.
- Skeleton states appear while loading.
- The empty state offers "Clear filters" and a WhatsApp CTA: "Tell us what you're looking for".

### 5.4 Filters

Filter option lists come from the database wherever possible. Do not hardcode them in the frontend.

| Filter | Type | Values |
|---|---|---|
| Price | Dual slider + min/max inputs (in lakh) | From inventory |
| Brand | Multi-select with counts | From `brands` |
| Model | Multi-select, depends on selected brands | From `models` |
| Year | Minimum year | 2024+, 2022+, 2020+, 2018+ … |
| KM driven | Maximum | < 10,000 / < 30,000 / < 50,000 / < 75,000 / < 1,00,000 |
| Fuel | Multi | Petrol, Diesel, CNG, Electric, Hybrid |
| Transmission | Multi | Manual, Automatic (AMT, CVT, DCT and Torque Converter are grouped under Automatic publicly) |
| Body type | Multi | Hatchback, Sedan, SUV, MUV, Coupe, Convertible, Luxury |
| Ownership | Multi | 1st, 2nd, 3rd+ |
| Colour | Multi | From inventory |
| Registration | Optional | State/city |

**Sort options** are Newest (default), Price low to high, Price high to low, KM low to high, and Year newest first.

**Later phase** adds engine CC, seating capacity, insurance validity, service history, and features such as sunroof, 360 camera, CarPlay/Android Auto, ADAS and ventilated seats.

### 5.5 Vehicle Card

- A 16:10 primary image using `next/image`, lazy below the fold
- Allowed badges only (see §4)
- Title such as "2022 Hyundai Creta" with the variant on the next line
- Spec row: km · fuel · transmission · owners
- Price in ₹ Lakh
- The whole card links to the detail page
- Hover uses elevation level 2 from `DESIGN.md`

### 5.6 Vehicle Detail Page (`/cars/[slug]`)

**Slugs** are SEO-friendly and never expose database IDs, for example `/cars/2022-hyundai-creta-sx-petrol-automatic`.

**Content:**

- **Gallery** with a large main image (swipe on mobile, arrows on desktop), a thumbnail strip, a fullscreen lightbox and an image count. The primary image comes first, then images follow `sort_order`.
- **Header** with year, brand and model, the variant, the full price (`₹15,25,000`) with a ₹ Lakh subtext, and spec chips.
- **Vehicle details table** listing brand, model, variant, year, fuel, transmission, engine CC, km driven, owners, colour and registration.
- **Features checklist.**
- **Description.**
- **Similar cars**: same body type, within ±20% of the price.

**CTAs:**

- **Enquire Now** opens the lead form.
- **WhatsApp** is a `wa.me` link with a prefilled message containing the car name, price and page URL.
- **Call Now** is a `tel:` link.
- On mobile, a sticky bottom bar shows WhatsApp, Call and Enquire, with safe-area padding.

**Status handling:**

- **Reserved** cars show an amber banner: "This car is reserved — enquire for similar cars".
- **Sold, archived or draft** slugs show a friendly page with similar available cars and return the correct status code (410 or 404).

### 5.7 Lead Capture

The lead form collects:

- **Name** (required)
- **Phone** (required, validated as an Indian 10-digit mobile)
- **Email** (optional)
- **Preferred time** (optional)
- **Message**

The car is attached automatically when the form is submitted from a detail page.

Submissions go through a server action with zod validation, a honeypot field and per-IP rate limiting. The success state offers a WhatsApp follow-up.

The target conversion path is: **Enquiry → WhatsApp/Call → Test drive → Sale.** There are no online payments.

---

## 6. Admin Dashboard

All routes live under `/admin`. They require authentication **and** membership in `admin_users`. There is no public sign-up. All admin pages are `noindex` and disallowed in `robots`.

### 6.1 Navigation

The navigation contains Dashboard, Cars, Add Car, Leads (with a badge showing the count of new leads), Testimonials, Homepage Content, Settings and Logout.

On desktop, the sidebar is navy. On mobile, it becomes a drawer.

### 6.2 Dashboard Overview (`/admin`)

- Stat cards: Total cars, Published, Reserved, Sold and New leads
- The 5 most recently added cars
- The 5 latest leads

### 6.3 Add / Edit Car (`/admin/cars/new`, `/admin/cars/[id]/edit`)

The form must be **ridiculously easy** for non-technical staff and usable on a phone. It is one scrolling page with section headers and a sticky save bar.

1. **Basics**
   - Brand: a searchable select
   - Model: filtered by brand, with an inline "add model" option
   - Variant
   - Slug: auto-generated, editable, and checked for uniqueness
2. **Price**
   - Selling price, with a live ₹ Lakh preview
   - Optional original/reference price
3. **Vehicle**
   - Year, km driven, fuel, transmission, body type, engine CC, owners and colour
4. **Registration**
   - State and city, defaulting to TS / Hyderabad
5. **Features**
   - A checkbox grid of common features: Sunroof, Reverse Camera, Apple CarPlay, Android Auto, Cruise Control, Push Start, Alloy Wheels, Airbags and similar
   - A custom feature input
6. **Description**
7. **Photos**
   - Multi-file drag-and-drop, plus the phone camera or gallery on mobile
   - Client-side resize and compression to WebP, with a maximum long edge of about 1920px
   - HEIC conversion if practical
   - Accepted types are jpg, png, webp and heic, with size limits enforced
   - A progress indicator per image
   - Drag to reorder, set a primary image, and delete
   - Suggested shot types: Front, Rear, Side, Interior, Dashboard, Tyres, Engine and Other. Aim for 10–20 photos per car.
8. **Featured** toggle

**Actions:**

- Save Draft and Publish are always available.
- On edit, the form also offers Unpublish, Mark Reserved, Mark Sold and Archive.

**Rules:**

- Publishing requires all required fields and at least one photo.
- `published_at` and `sold_at` are set automatically.
- The form warns before leaving with unsaved changes.

### 6.4 Inventory Management (`/admin/cars`)

- **Status tabs with counts:** All, Published, Draft, Reserved, Sold and Archived.
- **Search** by brand, model, variant or vehicle name.
- **Filters** for brand, fuel and transmission.
- **Desktop table** with columns for thumbnail, vehicle, price, year, km, status, featured, created and updated.
- **Mobile** shows a card list instead of the table.
- **Row actions:**
  - View on site (only when the car is public)
  - Edit
  - Duplicate, which copies all fields except photos and slug and sets the status to draft
  - Quick status change
  - Archive
- **Deleting:**
  - Only drafts may be deleted, and only after confirmation.
  - **Sold cars are never permanently deleted**, only archived.
- **Pagination** is server-side at 20 per page, with a default sort of updated date descending.

### 6.5 Leads (`/admin/leads`)

- The list shows newest first, with status tabs and counts.
- Search by name or phone, and filter by car.
- Each lead shows:
  - Name
  - Tap-to-call phone and a WhatsApp button
  - The linked car, with a thumbnail and name
  - Message and preferred time
  - Created time in a friendly format, such as "Today 8:42 PM"
- Staff can change the status inline and add internal notes.
- **Optional:** an email notification to the owner for each new lead, sent via Resend and behind an environment flag.

### 6.6 Testimonials (`/admin/testimonials`)

Staff can add, edit, delete and publish or unpublish testimonials. Each testimonial has a customer name, an optional photo, the review text and a rating from 1 to 5. Only published testimonials appear publicly.

### 6.7 Homepage Content (`/admin/content`)

Staff can edit:

- Hero title and description
- Hero image or video, uploaded to `site-media`
- CTA text and link
- Why Choose Us items (add, remove and reorder)
- Homepage video URL

Featured cars are managed through the car `featured` toggle.

### 6.8 Settings (`/admin/settings`)

Settings cover the dealership name, logo, phone, WhatsApp number, address, map URL, business hours and social links.

Admin changes must appear on the public site immediately via on-demand revalidation (`revalidatePath` / `revalidateTag`).

---

## 7. Car Status System

```text
DRAFT → PUBLISHED → RESERVED → SOLD → ARCHIVED
```

| Status | Public visibility |
|---|---|
| `draft` | Hidden |
| `published` | Visible in inventory |
| `reserved` | Visible, clearly marked "Reserved", sorted after available cars |
| `sold` | Removed from active inventory; the detail URL shows similar cars |
| `archived` | Hidden everywhere publicly |

Staff may move a car back from Reserved to Published if a deal falls through.

---

## 8. Lead Status System

```text
NEW → CONTACTED → TEST_DRIVE → NEGOTIATION → CLOSED
                                            ↘ LOST
```

---

## 9. Database Design (Supabase PostgreSQL)

### Enums

- `car_status`: draft, published, reserved, sold, archived
- `lead_status`: new, contacted, test_drive, negotiation, closed, lost
- `fuel_type`: petrol, diesel, cng, electric, hybrid
- `transmission`: manual, automatic, amt, cvt, dct, torque_converter
- `body_type`: hatchback, sedan, suv, muv, coupe, convertible, luxury

### Tables

**brands**
`id, name, slug (unique), logo, is_active, created_at`

**models**
`id, brand_id → brands, name, slug, is_active, created_at`, with `(brand_id, slug)` unique

**cars**
`id, brand_id → brands, model_id → models, variant, slug (unique), price, original_price, year, kms_driven, fuel_type, transmission, body_type, engine_cc, owners, color, registration_state, registration_city, description, status, featured, published_at, sold_at, created_at, updated_at`

**car_images**
`id, car_id → cars (cascade), image_url, storage_path, sort_order, is_primary, created_at`

**car_features**
`id, car_id → cars (cascade), feature_name`

**leads**
`id, car_id → cars (nullable), name, phone, email, preferred_time, message, status, notes, source, created_at, updated_at`

**testimonials**
`id, customer_name, customer_image, review, rating, is_published, created_at`

**homepage_content** (single row)
`id, hero_title, hero_description, hero_media_url, hero_media_type, cta_text, cta_link, why_us (jsonb), video_url, updated_at`

**site_settings** (single row)
`id, dealership_name, logo_url, phone, whatsapp_number, address, map_url, business_hours, socials (jsonb), updated_at`

**admin_users**
`user_id → auth.users, role, created_at`

### Indexes

Add indexes on `cars` for `brand_id`, `model_id`, `price`, `year`, `kms_driven`, `fuel_type`, `transmission`, `body_type`, `status`, `featured` and `created_at`, plus a composite index on `(status, created_at)`.

### Other requirements

- An `updated_at` trigger on mutable tables.
- A seed file with 12 Indian brands and their common models: Maruti Suzuki, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen, BMW and Mercedes-Benz.
- About 8 sample cars with TS/Hyderabad registration, clearly marked as sample data.
- Generated TypeScript types in `lib/database.types.ts`.

---

## 10. Authentication and Row Level Security

- Use Supabase Auth with email and password for admins only. Never store passwords yourself.
- Create an `is_admin()` SQL function that checks `admin_users`.
- Enable RLS on **every** table.

**Anonymous (public) users may:**

- SELECT cars where status is `published` or `reserved`, along with their images and features
- SELECT active brands and models, published testimonials, homepage content and site settings
- INSERT into `leads` only (no select or update)

**Admins may do everything else.**

**Checks and secrets:**

- Every admin server action re-checks `is_admin()`. Middleware alone is not enough.
- The service-role key is server-only and must never be imported into client code.

---

## 11. Storage

- The `car-images` bucket has public read and admin-only write. Path: `car-images/{car_id}/{uuid}.webp`.
- The `site-media` bucket holds hero images, videos, the logo and testimonial photos.
- Never store image binaries in PostgreSQL.
- Serve images through `next/image` with responsive `sizes`.

---

## 12. Design Direction

Follow `docs/DESIGN.md` for visual style, subject to the overrides in §4.

- **Font:** Plus Jakarta Sans.
- **Colours:**
  - Navy `#0B2545` / `#091E3A` (primary)
  - Blue `#0284C7` (actions) and `#0EA5E9` (highlights)
  - Green `#16A34A` / `#22C55E` (genuine trust signals only)
  - Amber `#F59E0B` (Reserved)
  - Canvas `#F8FAFC`, cards `#FFFFFF`, borders `#E2E8F0`
- **Radius:** 16px for cards, 8px for controls, full for chips and badges.
- **Elevation:** levels 1–3 as defined in `DESIGN.md`.
- **Feel:** premium, automotive, modern, minimal, trustworthy, fast and mobile-first.
- **Avoid:** excessive animation, overcrowded pages, generic template looks, and cloning Spinny.

---

## 13. Performance

- Keep first load fast and JavaScript minimal on public pages, preferring Server Components.
- Give the LCP image `priority` and lazy-load below-the-fold media.
- Filter on the server or database and paginate. Never render hundreds of cars at once.
- Cache public queries with tags and revalidate them on admin changes.
- **Target:** Lighthouse mobile score of 90+ on `/`, `/cars` and a detail page.

---

## 14. SEO

- Use `generateMetadata` on every public page. Title pattern: `2022 Hyundai Creta SX Petrol AT for sale in Hyderabad | {Dealer}`.
- Add meta descriptions, canonical URLs and Open Graph images (the primary car photo).
- Add JSON-LD: `AutoDealer` on the homepage and contact page, and `Car` with an `Offer` on detail pages.
- Generate `sitemap.ts` from published and reserved cars, plus brand and body-type pages.
- Generate `robots.ts` so that it blocks `/admin`.
- Filtered `/cars?…` URLs point their canonical to `/cars`.
- Only publicly published car pages are indexable.

---

## 15. Security

- Supabase RLS on all tables, with admin authentication and authorisation checks in every server action.
- Validate all input with zod and sanitise user-provided text.
- Validate file uploads by type and size.
- Protect the public lead form with a honeypot and rate limiting.
- Never expose secrets to client code.

---

## 16. MVP Scope

### Public (MVP)

The public MVP includes:

- Homepage
- Cars listing with filters, search and sorting
- Brand and body-type pages
- Car detail page
- WhatsApp, call and lead form
- About, Contact and Testimonials

### Admin (MVP)

The admin MVP includes:

- Login and dashboard overview
- Add, edit, duplicate and archive cars
- Multi-photo upload with reordering and a primary image
- Publish, unpublish, reserve and sell cars
- Featured cars
- Leads with statuses and notes
- Testimonials
- Homepage content and settings

### Do NOT build in the MVP

Customer accounts, favourites, online payments, EMI or loan integrations, insurance APIs, RC transfer automation, AI recommendations, a seller marketplace, auctions and a complex CRM.

### Phase 2 (after the client is using it)

Compare cars, saved cars, an EMI calculator (only if the dealer wants it), test-drive booking slots, WhatsApp/email lead automation, analytics, generated SEO landing pages, staff accounts and role permissions.

### Phase 3 (larger dealership)

CRM and sales pipeline, inventory and pricing analytics, inspection records, document management, multiple branches and staff performance.

---

## 17. Build Order

Each phase must work, and be committed, before the next begins.

1. **Setup:** `CLAUDE.md`, project scaffold, design tokens and UI primitives.
2. **Database:** Supabase schema, enums, RLS, storage buckets, seed data and types.
3. **Admin authentication and dashboard shell.**
4. **Add/Edit car:** the form and image upload.
5. **Admin inventory:** the table and status management.
6. **Public `/cars`:** filters, sorting and pagination.
7. **Car detail page and lead capture.**
8. **Homepage, content management, settings and testimonials.**
9. **Leads management.**
10. **SEO and performance pass.**
11. **Security review, tests, Vercel deployment, and `docs/ADMIN_GUIDE.md`** for the non-technical owner.

---

## 18. Business Workflow (What the System Must Support)

```text
Car arrives → Staff photographs it → Staff opens dashboard → Add Car
→ Upload 10–20 photos → Enter specs → Add description → Publish
→ Car appears on website → Customer finds it → WhatsApp / Call / Enquiry
→ Lead appears in dashboard → Staff contacts customer → Test drive
→ Mark Reserved → Mark Sold → Car leaves active inventory
```

## 19. Acceptance Test (End-to-End)

1. An admin logs in and adds a **2023 BMW X1, ₹42,00,000, Petrol, Automatic, 28,000 km** with photos.
2. The admin publishes it.
3. It appears on `/cars`, on `/cars/brand/bmw`, and under the Petrol, Automatic and relevant body-type filters. If marked featured, it also appears in the homepage featured section.
4. A visitor submits an enquiry from its detail page, and the lead appears in `/admin/leads` with the car linked.
5. The admin marks the car **Sold**, and it disappears from all active listings.

The final product must be production-ready, responsive, maintainable and easy for a non-technical dealership owner to operate.

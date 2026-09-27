-- Core tables, constraints, triggers and indexes (PRODUCT_SPEC §9).
-- Money is stored in whole rupees; distances in km.

-- ---------------------------------------------------------------------------
-- brands / models
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint models_brand_id_slug_key unique (brand_id, slug),
  -- Target for the cars (model_id, brand_id) FK, so a car's model always
  -- belongs to its brand.
  constraint models_id_brand_id_key unique (id, brand_id)
);

-- brand_id is the leading column of models_brand_id_slug_key, so it is
-- already indexed.

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  model_id uuid not null,
  variant text check (char_length(variant) <= 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  price integer not null check (price > 0),
  original_price integer check (original_price > 0),
  year smallint not null check (year between 1980 and 2100),
  kms_driven integer not null check (kms_driven >= 0),
  fuel_type public.fuel_type not null,
  transmission public.transmission not null,
  body_type public.body_type not null,
  engine_cc smallint check (engine_cc > 0),
  owners smallint not null default 1 check (owners between 1 and 10),
  color text check (char_length(color) <= 40),
  registration_state text default 'TS' check (char_length(registration_state) <= 40),
  registration_city text default 'Hyderabad' check (char_length(registration_city) <= 60),
  description text check (char_length(description) <= 5000),
  status public.car_status not null default 'draft',
  featured boolean not null default false,
  -- Seed rows only; lets sample inventory be found and removed in one query.
  is_sample boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cars_brand_id_fkey foreign key (brand_id)
    references public.brands (id) on delete restrict,
  constraint cars_model_id_brand_id_fkey foreign key (model_id, brand_id)
    references public.models (id, brand_id) on delete restrict
);

create index cars_brand_id_idx on public.cars (brand_id);
create index cars_model_id_idx on public.cars (model_id);
create index cars_price_idx on public.cars (price);
create index cars_year_idx on public.cars (year);
create index cars_kms_driven_idx on public.cars (kms_driven);
create index cars_fuel_type_idx on public.cars (fuel_type);
create index cars_transmission_idx on public.cars (transmission);
create index cars_body_type_idx on public.cars (body_type);
create index cars_status_idx on public.cars (status);
create index cars_featured_idx on public.cars (featured);
create index cars_created_at_idx on public.cars (created_at);
create index cars_status_created_at_idx on public.cars (status, created_at desc);

create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

-- published_at is stamped the first time a car goes public and kept after
-- that, so unpublishing and republishing cannot re-trigger "New Arrival".
-- sold_at is stamped on the move to sold and cleared if a sale is undone.
create function public.set_car_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('published', 'reserved') and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status = 'sold' then
    if new.sold_at is null then
      new.sold_at := now();
    end if;
  elsif new.status in ('draft', 'published', 'reserved') then
    new.sold_at := null;
  end if;

  return new;
end;
$$;

create trigger cars_set_status_timestamps
  before insert or update of status on public.cars
  for each row execute function public.set_car_status_timestamps();

-- ---------------------------------------------------------------------------
-- car_images / car_features
-- ---------------------------------------------------------------------------

create table public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index car_images_car_id_sort_order_idx on public.car_images (car_id, sort_order);
create unique index car_images_one_primary_per_car on public.car_images (car_id) where is_primary;

create table public.car_features (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  feature_name text not null check (char_length(feature_name) between 1 and 60),
  constraint car_features_car_id_feature_name_key unique (car_id, feature_name)
);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references public.cars (id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  -- Indian 10-digit mobile, stored without +91 or spaces.
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text check (char_length(email) <= 254),
  preferred_time text check (char_length(preferred_time) <= 100),
  message text check (char_length(message) <= 2000),
  status public.lead_status not null default 'new',
  notes text check (char_length(notes) <= 5000),
  source text not null default 'website' check (char_length(source) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_car_id_idx on public.leads (car_id);
create index leads_status_created_at_idx on public.leads (status, created_at desc);
create index leads_created_at_idx on public.leads (created_at desc);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_image text,
  review text not null check (char_length(review) between 1 and 2000),
  rating smallint not null check (rating between 1 and 5),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_is_published_created_at_idx
  on public.testimonials (is_published, created_at desc);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Single-row tables: homepage_content, site_settings (id is always 1)
-- ---------------------------------------------------------------------------

create table public.homepage_content (
  id smallint primary key default 1 check (id = 1),
  hero_title text not null check (char_length(hero_title) between 1 and 120),
  hero_description text check (char_length(hero_description) <= 400),
  hero_media_url text,
  hero_media_type text check (hero_media_type in ('image', 'video')),
  cta_text text check (char_length(cta_text) <= 40),
  cta_link text check (char_length(cta_link) <= 300),
  -- [{ "title": string, "description": string }], in display order.
  why_us jsonb not null default '[]'::jsonb check (jsonb_typeof(why_us) = 'array'),
  video_url text,
  updated_at timestamptz not null default now()
);

create trigger homepage_content_set_updated_at
  before update on public.homepage_content
  for each row execute function public.set_updated_at();

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  dealership_name text not null check (char_length(dealership_name) between 1 and 100),
  logo_url text,
  phone text check (char_length(phone) <= 20),
  whatsapp_number text check (char_length(whatsapp_number) <= 20),
  address text check (char_length(address) <= 400),
  map_url text,
  business_hours text check (char_length(business_hours) <= 200),
  -- { "instagram": url, "facebook": url, "youtube": url, ... }
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- The app only ever updates these rows, so they must exist in every
-- environment (not just seeded ones). Why Choose Us uses the safe defaults
-- from CLAUDE.md §4; everything else is edited from /admin.
insert into public.homepage_content (id, hero_title, hero_description, cta_text, cta_link, why_us)
values (
  1,
  'Quality pre-owned cars in Hyderabad',
  'Browse our current stock, compare prices and enquire in minutes.',
  'Browse cars',
  '/cars',
  '[
    {"title": "Quality cars", "description": "A hand-picked range of popular makes and models."},
    {"title": "Transparent pricing", "description": "The price is listed clearly on every car."},
    {"title": "Verified inventory", "description": "Every listing is a real car in our stock, with real photos."},
    {"title": "Easy documentation", "description": "We walk you through the paperwork step by step."},
    {"title": "Customer-first service", "description": "Call or WhatsApp us with any question, no pressure."}
  ]'::jsonb
);

insert into public.site_settings (id, dealership_name)
values (1, 'Dealership name');

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

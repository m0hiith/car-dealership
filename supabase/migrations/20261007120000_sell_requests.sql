-- "Sell Your Car" requests from /sell, worked through in /admin/sell-requests.
--
-- Public (anon) may INSERT the customer's own fields only (column grants);
-- the server action rate-limits per IP and checks every photo before
-- inserting. Only admins can read, update or delete.
--
-- Photos live in the private 'sell-requests' bucket. The browser uploads
-- each one to a signed upload URL the server issued (uploads/{uuid}.webp);
-- the bucket itself only accepts WebP up to 10 MB. Admins view them through
-- short-lived signed URLs.

create type public.sell_request_status as enum (
  'new',
  'contacted',
  'inspection_scheduled',
  'offer_made',
  'purchased',
  'rejected'
);

-- Every stored photo path must be one the server could have issued.
create function public.valid_sell_photo_paths(p_paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(p_paths), 0) <= 8
    and not exists (
      select 1
      from unnest(p_paths) as p(path)
      where path !~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    );
$$;

create table public.sell_requests (
  id uuid primary key default gen_random_uuid(),

  -- Car. The names are always stored (picked from the list or typed under
  -- "Other"), so a request still reads correctly if a brand is renamed.
  brand_id uuid references public.brands (id) on delete set null,
  model_id uuid references public.models (id) on delete set null,
  brand_name text not null check (char_length(brand_name) between 1 and 60),
  model_name text not null check (char_length(model_name) between 1 and 60),
  variant text check (char_length(variant) <= 100),
  year smallint not null check (year between 1980 and 2100),
  kms_driven integer not null check (kms_driven between 0 and 2000000),
  fuel_type public.fuel_type not null,
  transmission public.transmission not null,
  owners smallint not null check (owners between 1 and 10),
  registration_state text check (char_length(registration_state) <= 10),
  registration_city text check (char_length(registration_city) <= 60),
  expected_price integer check (expected_price between 1 and 1000000000),
  condition_notes text check (char_length(condition_notes) <= 2000),
  photo_paths text[] not null default '{}' check (public.valid_sell_photo_paths(photo_paths)),

  -- Seller
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  preferred_time text check (char_length(preferred_time) <= 60),

  -- Staff workflow
  status public.sell_request_status not null default 'new',
  notes text check (char_length(notes) <= 5000),
  follow_up_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sell_requests_status_created_at_idx on public.sell_requests (status, created_at desc);
create index sell_requests_created_at_idx on public.sell_requests (created_at desc);

create trigger sell_requests_set_updated_at
  before update on public.sell_requests
  for each row execute function public.set_updated_at();

alter table public.sell_requests enable row level security;

-- Anon can only supply the request itself; status, notes, follow-up and
-- timestamps always take their defaults.
grant insert (
  brand_id, model_id, brand_name, model_name, variant, year, kms_driven, fuel_type, transmission, owners,
  registration_state, registration_city, expected_price, condition_notes, photo_paths, name, phone, preferred_time
) on public.sell_requests to anon;
grant select, insert, update, delete on public.sell_requests to authenticated;
grant all on public.sell_requests to service_role;

create policy "Anyone can send a sell request"
  on public.sell_requests for insert to anon, authenticated
  with check (status = 'new' and notes is null and follow_up_at is null);

create policy "Admins read sell requests"
  on public.sell_requests for select to authenticated
  using ((select public.is_admin()));

create policy "Admins update sell requests"
  on public.sell_requests for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete sell requests"
  on public.sell_requests for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage: private bucket, WebP only, 10 MB per file
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sell-requests', 'sell-requests', false, 10485760, array['image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads go through server-issued signed URLs, so no insert policy is
-- needed for visitors. Admins may view and remove photos.
create policy "Admins read sell request photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'sell-requests' and (select public.is_admin()));

create policy "Admins delete sell request photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sell-requests' and (select public.is_admin()));

-- The seeded "Sell Your Car" service (20261007110000_services.sql) pointed
-- at WhatsApp until this page existed. Only change it if staff have not.
update public.services
set cta_link = '/sell', cta_label = 'Sell your car'
where title = 'Sell Your Car' and cta_link is null and cta_label is null;

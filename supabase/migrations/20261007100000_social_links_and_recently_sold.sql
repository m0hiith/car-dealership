-- Homepage: scrolling social banner and "Recently Sold" section.
--
-- 1. cars.show_in_sold_section: staff can hide a sold car from the homepage
--    section. (cars.sold_at already exists and is stamped by
--    set_car_status_timestamps() when a car moves to sold.)
-- 2. recent_sold_cars(): the public card facts of recently sold cars. Anon
--    cannot read sold rows or their photos under RLS, hence security
--    definer. It returns no ids and no internal fields, only the slug (for
--    the "sold" page), the card facts and the cover photo URL.
-- 3. social_links: editable from /admin/content, shown in the homepage banner.

-- ---------------------------------------------------------------------------
-- 1. show_in_sold_section
-- ---------------------------------------------------------------------------

alter table public.cars
  add column show_in_sold_section boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. Recently sold
-- ---------------------------------------------------------------------------

create function public.recent_sold_cars(p_limit integer default 8)
returns table (
  slug text,
  brand text,
  model text,
  variant text,
  year smallint,
  body_type public.body_type,
  price integer,
  kms_driven integer,
  fuel_type public.fuel_type,
  transmission public.transmission,
  owners smallint,
  sold_at timestamptz,
  cover_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.slug,
    b.name,
    m.name,
    c.variant,
    c.year,
    c.body_type,
    c.price,
    c.kms_driven,
    c.fuel_type,
    c.transmission,
    c.owners,
    c.sold_at,
    (
      select i.image_url
      from public.car_images i
      where i.car_id = c.id
      order by i.is_primary desc, i.sort_order, i.created_at
      limit 1
    )
  from public.cars c
  join public.brands b on b.id = c.brand_id
  join public.models m on m.id = c.model_id
  where c.status = 'sold'
    and c.show_in_sold_section
  order by c.sold_at desc nulls last, c.id
  limit least(greatest(p_limit, 1), 8);
$$;

revoke execute on function public.recent_sold_cars(integer) from public;
grant execute on function public.recent_sold_cars(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Social links
-- ---------------------------------------------------------------------------

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null
    check (platform in ('instagram', 'youtube', 'facebook', 'whatsapp', 'other')),
  label text not null check (char_length(label) between 1 and 60),
  url text not null check (url like 'https://%' and char_length(url) <= 500),
  -- Optional card image (site-media bucket); without it the banner shows the platform icon.
  thumbnail_url text check (thumbnail_url is null or char_length(thumbnail_url) <= 500),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index social_links_sort_order_idx on public.social_links (sort_order, created_at);

alter table public.social_links enable row level security;

grant select on public.social_links to anon;
grant select, insert, update, delete on public.social_links to authenticated;
grant all on public.social_links to service_role;

create policy "Active social links are public; admins see all"
  on public.social_links for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins insert social links"
  on public.social_links for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update social links"
  on public.social_links for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete social links"
  on public.social_links for delete to authenticated
  using ((select public.is_admin()));

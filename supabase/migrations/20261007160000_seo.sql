-- SEO.
--
-- 1. cars.seo_title / seo_description: optional per-car overrides for the
--    page title and meta description (empty = generated from the car).
-- 2. site_settings.google_site_verification: the Search Console token,
--    printed as <meta name="google-site-verification"> on public pages.
-- 3. get_unavailable_car_by_slug() now also returns sold_at, so a sold car's
--    page can stay indexable for 30 days after the sale (showing similar
--    cars) before it answers 410 Gone. Archived cars are gone straight away.

alter table public.cars
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 160);

alter table public.site_settings
  add column google_site_verification text
    check (google_site_verification ~ '^[A-Za-z0-9_-]{10,100}$');

-- The return type changes, so the function is replaced rather than altered.
drop function public.get_unavailable_car_by_slug(text);

create function public.get_unavailable_car_by_slug(p_slug text)
returns table (
  brand text,
  model text,
  variant text,
  year smallint,
  body_type public.body_type,
  price integer,
  status public.car_status,
  sold_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, m.name, c.variant, c.year, c.body_type, c.price, c.status, c.sold_at
  from public.cars c
  join public.brands b on b.id = c.brand_id
  join public.models m on m.id = c.model_id
  where c.slug = p_slug
    and c.status in ('sold', 'archived');
$$;

revoke execute on function public.get_unavailable_car_by_slug(text) from public;
grant execute on function public.get_unavailable_car_by_slug(text) to anon, authenticated;

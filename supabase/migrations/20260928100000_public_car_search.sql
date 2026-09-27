-- Public /cars listing (phase 6).
--
-- 1. filter_public_cars(): the one place the public filters are defined.
--    Returns setof cars, so PostgREST can embed brand/model/images and apply
--    order and range on top of it.
-- 2. public_car_facets(): option lists and counts for the filter panel
--    (brands, models of the selected brands, colours, price bounds), built
--    from the same filter function.
--
-- Both are security invoker: RLS applies, and the status check below keeps
-- them to public inventory even for signed-in admins.
--
-- p_filters (every key optional; the app validates before calling):
--   brands        text[]  brand slugs
--   models        text[]  model slugs, within the selected brands
--   price_min     int     rupees
--   price_max     int     rupees
--   year_min      int
--   km_max        int
--   fuels         text[]  fuel_type values
--   transmissions text[]  'manual' and/or 'automatic' (every non-manual type)
--   body_types    text[]  body_type values
--   owners        int[]   1, 2, 3 (3 means 3 or more)
--   colours       text[]  lowercase colour names

create function public.jsonb_text_array(p jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p) = 'array' then array(select jsonb_array_elements_text(p))
    else null
  end;
$$;

create function public.filter_public_cars(p_filters jsonb)
returns setof public.cars
language sql
stable
security invoker
set search_path = ''
as $$
  with f as (
    select
      public.jsonb_text_array(p_filters -> 'brands') as brands,
      public.jsonb_text_array(p_filters -> 'models') as models,
      (p_filters ->> 'price_min')::int as price_min,
      (p_filters ->> 'price_max')::int as price_max,
      (p_filters ->> 'year_min')::int as year_min,
      (p_filters ->> 'km_max')::int as km_max,
      public.jsonb_text_array(p_filters -> 'fuels') as fuels,
      public.jsonb_text_array(p_filters -> 'transmissions') as transmissions,
      public.jsonb_text_array(p_filters -> 'body_types') as body_types,
      public.jsonb_text_array(p_filters -> 'owners') as owners,
      public.jsonb_text_array(p_filters -> 'colours') as colours
  )
  select c.*
  from public.cars c, f
  where c.status in ('published', 'reserved')
    and (
      f.brands is null
      or c.brand_id in (select b.id from public.brands b where b.slug = any (f.brands))
    )
    and (
      f.models is null
      or c.model_id in (
        select m.id
        from public.models m
        join public.brands b on b.id = m.brand_id
        where m.slug = any (f.models) and (f.brands is null or b.slug = any (f.brands))
      )
    )
    and (f.price_min is null or c.price >= f.price_min)
    and (f.price_max is null or c.price <= f.price_max)
    and (f.year_min is null or c.year >= f.year_min)
    and (f.km_max is null or c.kms_driven <= f.km_max)
    and (f.fuels is null or c.fuel_type::text = any (f.fuels))
    and (
      f.transmissions is null
      or ('manual' = any (f.transmissions) and c.transmission = 'manual')
      or ('automatic' = any (f.transmissions) and c.transmission <> 'manual')
    )
    and (f.body_types is null or c.body_type::text = any (f.body_types))
    and (
      f.owners is null
      or c.owners::text = any (f.owners)
      or ('3' = any (f.owners) and c.owners >= 3)
    )
    and (f.colours is null or lower(btrim(c.color)) = any (f.colours));
$$;

-- Each facet ignores its own filter, so picking one brand still lists the
-- others (with their counts) to add. Selected options are always returned,
-- even at zero, so they can be unticked.
create function public.public_car_facets(p_filters jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  selected as (
    select
      coalesce(public.jsonb_text_array(p_filters -> 'brands'), '{}') as brands,
      coalesce(public.jsonb_text_array(p_filters -> 'models'), '{}') as models,
      coalesce(public.jsonb_text_array(p_filters -> 'colours'), '{}') as colours
  ),
  brand_counts as (
    select b.slug, b.name, count(c.id) as n
    from public.brands b
    left join public.filter_public_cars(p_filters - 'brands' - 'models') c on c.brand_id = b.id
    group by b.id
  ),
  model_counts as (
    select m.slug, m.name, b.slug as brand_slug, b.name as brand_name, count(c.id) as n
    from public.models m
    join public.brands b on b.id = m.brand_id
    cross join selected s
    left join public.filter_public_cars(p_filters - 'models') c on c.model_id = m.id
    where b.slug = any (s.brands)
    group by m.id, b.id
  ),
  colour_matches as (
    select lower(btrim(c.color)) as value, min(btrim(c.color)) as name, count(*) as n
    from public.filter_public_cars(p_filters - 'colours') c
    where nullif(btrim(c.color), '') is not null
    group by lower(btrim(c.color))
  ),
  colour_counts as (
    select value, name, n from colour_matches
    union all
    select s.value, s.value, 0
    from selected, unnest(selected.colours) as s(value)
    where s.value not in (select value from colour_matches)
  ),
  bounds as (
    select min(c.price) as price_min, max(c.price) as price_max
    from public.cars c
    where c.status in ('published', 'reserved')
  )
  select jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'count', n) order by name)
      from brand_counts, selected s
      where n > 0 or slug = any (s.brands)
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(
        jsonb_build_object('slug', slug, 'name', name, 'brandSlug', brand_slug, 'brandName', brand_name, 'count', n)
        order by brand_name, name
      )
      from model_counts, selected s
      where n > 0 or slug = any (s.models)
    ), '[]'::jsonb),
    'colours', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'name', initcap(name), 'count', n) order by n desc, value)
      from colour_counts
    ), '[]'::jsonb),
    'priceMin', (select price_min from bounds),
    'priceMax', (select price_max from bounds)
  );
$$;

revoke execute on function public.jsonb_text_array(jsonb) from public;
revoke execute on function public.filter_public_cars(jsonb) from public;
revoke execute on function public.public_car_facets(jsonb) from public;
grant execute on function public.jsonb_text_array(jsonb) to anon, authenticated;
grant execute on function public.filter_public_cars(jsonb) to anon, authenticated;
grant execute on function public.public_car_facets(jsonb) to anon, authenticated;

-- Default "Newest" sort.
create index cars_status_published_at_idx on public.cars (status, published_at desc);

-- Homepage, About page and site content (phase 8).
--
-- 1. About page copy on homepage_content, edited from /admin/content.
-- 2. public_browse_options(): what the homepage search box and body-type
--    tiles need in one small call: brands and models that have cars in stock,
--    and the number of cars of each body type. Built on filter_public_cars(),
--    so it counts exactly what /cars would show.

alter table public.homepage_content
  add column about_title text check (char_length(about_title) <= 120),
  add column about_body text check (char_length(about_body) <= 5000);

create function public.public_browse_options()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  stock as (
    select c.brand_id, c.model_id, c.body_type
    from public.filter_public_cars('{}'::jsonb) c
  ),
  models as (
    select m.brand_id, m.slug, m.name, count(*) as n
    from stock s
    join public.models m on m.id = s.model_id
    group by m.id
  ),
  brands as (
    select b.id, b.slug, b.name, count(*) as n
    from stock s
    join public.brands b on b.id = s.brand_id
    group by b.id
  ),
  body_types as (
    select s.body_type::text as body_type, count(*) as n
    from stock s
    group by s.body_type
  )
  select jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', b.slug,
          'name', b.name,
          'count', b.n,
          'models', coalesce((
            select jsonb_agg(jsonb_build_object('slug', m.slug, 'name', m.name, 'count', m.n) order by m.name)
            from models m
            where m.brand_id = b.id
          ), '[]'::jsonb)
        )
        order by b.name
      )
      from brands b
    ), '[]'::jsonb),
    'bodyTypes', coalesce((select jsonb_object_agg(body_type, n) from body_types), '{}'::jsonb)
  );
$$;

revoke execute on function public.public_browse_options() from public;
grant execute on function public.public_browse_options() to anon, authenticated;

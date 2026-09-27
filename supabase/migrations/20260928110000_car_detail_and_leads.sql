-- Car detail page and lead capture (phase 7).
--
-- 1. get_unavailable_car_by_slug(): the few public facts about a sold or
--    archived car, so its old URL can say "sold" (HTTP 410) and suggest
--    similar cars. Anon cannot read these rows under RLS, hence security
--    definer, and it returns no images, ids or internal fields.
-- 2. similar_public_cars(): available cars like a given one, closest first.
-- 3. lead_rate_limits + take_lead_rate_limit(): per-IP limit for the public
--    lead form. Service role only; the table holds hashed IPs, never raw ones.

-- ---------------------------------------------------------------------------
-- 1. Sold / archived lookup
-- ---------------------------------------------------------------------------

create function public.get_unavailable_car_by_slug(p_slug text)
returns table (
  brand text,
  model text,
  variant text,
  year smallint,
  body_type public.body_type,
  price integer,
  status public.car_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, m.name, c.variant, c.year, c.body_type, c.price, c.status
  from public.cars c
  join public.brands b on b.id = c.brand_id
  join public.models m on m.id = c.model_id
  where c.slug = p_slug
    and c.status in ('sold', 'archived');
$$;

revoke execute on function public.get_unavailable_car_by_slug(text) from public;
grant execute on function public.get_unavailable_car_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Similar cars
-- ---------------------------------------------------------------------------

-- p_strict: same body type AND within ±20% of the price (detail page).
-- Otherwise same body type OR within ±20% (sold page), with cars matching
-- both first. Then available before reserved, then the closest price.
-- Returns setof cars so PostgREST can embed brand, model and cover photo.
create function public.similar_public_cars(
  p_body_type public.body_type,
  p_price integer,
  p_exclude uuid default null,
  p_strict boolean default true,
  p_limit integer default 8
)
returns setof public.cars
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.cars c
  where c.status in ('published', 'reserved')
    and (p_exclude is null or c.id <> p_exclude)
    and (
      case
        when p_strict then c.body_type = p_body_type and c.price between p_price * 0.8 and p_price * 1.2
        else c.body_type = p_body_type or c.price between p_price * 0.8 and p_price * 1.2
      end
    )
  order by
    (c.body_type = p_body_type and c.price between p_price * 0.8 and p_price * 1.2) desc,
    c.status,
    abs(c.price - p_price),
    c.id
  limit least(greatest(p_limit, 1), 24);
$$;

revoke execute on function public.similar_public_cars(public.body_type, integer, uuid, boolean, integer) from public;
grant execute on function public.similar_public_cars(public.body_type, integer, uuid, boolean, integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lead form rate limit
-- ---------------------------------------------------------------------------

-- Fixed window per key (a SHA-256 of the visitor's IP).
create table public.lead_rate_limits (
  key text primary key check (char_length(key) <= 128),
  window_start timestamptz not null default now(),
  hits integer not null default 1
);

create index lead_rate_limits_window_start_idx on public.lead_rate_limits (window_start);

-- RLS with no policies: only the service role (which bypasses RLS) can touch it.
alter table public.lead_rate_limits enable row level security;
revoke all on public.lead_rate_limits from anon, authenticated;

-- Counts one attempt and returns true while the key is within p_max
-- attempts per p_window. Stale rows are cleared as it goes.
create function public.take_lead_rate_limit(p_key text, p_max integer, p_window interval)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  delete from public.lead_rate_limits where window_start < now() - interval '1 day';

  insert into public.lead_rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning hits <= p_max;
$$;

revoke execute on function public.take_lead_rate_limit(text, integer, interval) from public, anon, authenticated;
grant execute on function public.take_lead_rate_limit(text, integer, interval) to service_role;

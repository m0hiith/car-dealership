-- Add/Edit car (phase 4).
--
-- 1. save_car(): writes a car, its features and its photo list in one
--    transaction, so a failed save never leaves a car half-updated.
-- 2. A deferred check that published and reserved cars always have at least
--    one photo (PRODUCT_SPEC §6.3). The app checks first; this is the backstop.

-- ---------------------------------------------------------------------------
-- Publish rule: public cars need a photo
-- ---------------------------------------------------------------------------

create function public.check_public_car_has_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_car_id uuid;
begin
  v_car_id := case when tg_table_name = 'cars' then new.id else old.car_id end;

  if exists (
    select 1 from public.cars c
    where c.id = v_car_id
      and c.status in ('published', 'reserved')
      and not exists (select 1 from public.car_images i where i.car_id = c.id)
  ) then
    raise exception 'A car needs at least one photo before it can be published.'
      using errcode = 'check_violation', hint = 'car_needs_photo';
  end if;

  return null;
end;
$$;

revoke execute on function public.check_public_car_has_photo() from public, anon, authenticated;

-- Deferred to commit, so a save can set the status and add photos in any order.
create constraint trigger cars_public_needs_photo
  after insert or update of status on public.cars
  deferrable initially deferred
  for each row execute function public.check_public_car_has_photo();

create constraint trigger car_images_public_needs_photo
  after delete on public.car_images
  deferrable initially deferred
  for each row execute function public.check_public_car_has_photo();

-- ---------------------------------------------------------------------------
-- save_car()
-- ---------------------------------------------------------------------------
-- p_car:      car columns (brand_id, model_id, variant, slug, price, ...,
--             status, featured). id, is_sample and timestamps are ignored.
-- p_features: feature names, already trimmed and de-duplicated.
-- p_photos:   storage paths in display order; the first is the cover photo.
--             Each must be '{car_id}/{uuid}.webp' in the car-images bucket.
-- p_photo_base_url: public URL prefix for the bucket, used to build image_url.
--
-- Returns the storage paths of photos removed by this save, so the caller
-- can delete the files.
--
-- security invoker: RLS applies, and the is_admin() check below gives a
-- clear error instead of an empty result.

create function public.save_car(
  p_car_id uuid,
  p_car jsonb,
  p_features text[],
  p_photos text[],
  p_photo_base_url text
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.cars;
  v_removed text[];
  v_path text;
begin
  if not (select public.is_admin()) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  foreach v_path in array coalesce(p_photos, '{}') loop
    if v_path !~ ('^' || p_car_id::text || '/[0-9a-f-]{36}\.webp$') then
      raise exception 'Invalid photo path: %', v_path using errcode = 'invalid_parameter_value';
    end if;
  end loop;

  r := jsonb_populate_record(null::public.cars, p_car);

  insert into public.cars as c (
    id, brand_id, model_id, variant, slug, price, original_price, year,
    kms_driven, fuel_type, transmission, body_type, engine_cc, owners, color,
    registration_state, registration_city, description, status, featured
  )
  values (
    p_car_id, r.brand_id, r.model_id, r.variant, r.slug, r.price, r.original_price, r.year,
    r.kms_driven, r.fuel_type, r.transmission, r.body_type, r.engine_cc, r.owners, r.color,
    r.registration_state, r.registration_city, r.description, r.status, r.featured
  )
  on conflict (id) do update set
    brand_id = excluded.brand_id,
    model_id = excluded.model_id,
    variant = excluded.variant,
    slug = excluded.slug,
    price = excluded.price,
    original_price = excluded.original_price,
    year = excluded.year,
    kms_driven = excluded.kms_driven,
    fuel_type = excluded.fuel_type,
    transmission = excluded.transmission,
    body_type = excluded.body_type,
    engine_cc = excluded.engine_cc,
    owners = excluded.owners,
    color = excluded.color,
    registration_state = excluded.registration_state,
    registration_city = excluded.registration_city,
    description = excluded.description,
    status = excluded.status,
    featured = excluded.featured;

  -- Features: replace the whole set.
  delete from public.car_features where car_id = p_car_id;
  insert into public.car_features (car_id, feature_name)
  select p_car_id, f from unnest(coalesce(p_features, '{}')) as f;

  -- Photos: drop the ones no longer listed, add new ones, then renumber.
  with removed as (
    delete from public.car_images
    where car_id = p_car_id and storage_path <> all (coalesce(p_photos, '{}'))
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from removed;

  -- Clear the cover first so the one-primary-per-car index never sees two.
  update public.car_images set is_primary = false where car_id = p_car_id and is_primary;

  insert into public.car_images (car_id, storage_path, image_url, sort_order, is_primary)
  select p_car_id, p.path, rtrim(p_photo_base_url, '/') || '/' || p.path, p.ord - 1, p.ord = 1
  from unnest(coalesce(p_photos, '{}')) with ordinality as p(path, ord)
  where not exists (
    select 1 from public.car_images i where i.car_id = p_car_id and i.storage_path = p.path
  );

  update public.car_images i
  set sort_order = p.ord - 1, is_primary = (p.ord = 1)
  from unnest(coalesce(p_photos, '{}')) with ordinality as p(path, ord)
  where i.car_id = p_car_id and i.storage_path = p.path;

  return v_removed;
end;
$$;

revoke execute on function public.save_car(uuid, jsonb, text[], text[], text) from public, anon;
grant execute on function public.save_car(uuid, jsonb, text[], text[], text) to authenticated;

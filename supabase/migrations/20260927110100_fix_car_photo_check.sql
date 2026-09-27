-- Fix for 20260927110000_car_save.sql: plpgsql resolves every record field in
-- a CASE expression, so `old.car_id` failed when the trigger ran on cars
-- ("record old has no field car_id"). Branch with IF instead.

create or replace function public.check_public_car_has_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_car_id uuid;
begin
  if tg_table_name = 'cars' then
    v_car_id := new.id;
  else
    v_car_id := old.car_id;
  end if;

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

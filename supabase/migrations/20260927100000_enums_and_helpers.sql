-- Enums and shared trigger functions (PRODUCT_SPEC §7–9).

create type public.car_status as enum ('draft', 'published', 'reserved', 'sold', 'archived');

create type public.lead_status as enum (
  'new',
  'contacted',
  'test_drive',
  'negotiation',
  'closed',
  'lost'
);

create type public.fuel_type as enum ('petrol', 'diesel', 'cng', 'electric', 'hybrid');

-- amt, cvt, dct and torque_converter are all shown as "Automatic" publicly.
create type public.transmission as enum (
  'manual',
  'automatic',
  'amt',
  'cvt',
  'dct',
  'torque_converter'
);

create type public.body_type as enum (
  'hatchback',
  'sedan',
  'suv',
  'muv',
  'coupe',
  'convertible',
  'luxury'
);

-- Keeps updated_at current on every UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Seed data. Safe to re-run: every insert skips rows that already exist.
--
-- Part 1 (brands and models) is reference data the live site needs.
-- Part 2 (cars) is SAMPLE DATA for development and demos only: every row has
-- is_sample = true and a description starting "SAMPLE LISTING". Remove it
-- before launch with:
--
--   delete from public.cars where is_sample;
--
-- (car_images, car_features and lead links are cleaned up by the FKs.)

-- ===========================================================================
-- Part 1: brands and models
-- ===========================================================================

insert into public.brands (name, slug)
values
  ('Maruti Suzuki', 'maruti-suzuki'),
  ('Hyundai', 'hyundai'),
  ('Tata', 'tata'),
  ('Mahindra', 'mahindra'),
  ('Kia', 'kia'),
  ('Toyota', 'toyota'),
  ('Honda', 'honda'),
  ('MG', 'mg'),
  ('Skoda', 'skoda'),
  ('Volkswagen', 'volkswagen'),
  ('BMW', 'bmw'),
  ('Mercedes-Benz', 'mercedes-benz')
on conflict (slug) do nothing;

insert into public.models (brand_id, name, slug)
select b.id, m.name, m.slug
from (
  values
    ('maruti-suzuki', 'Alto K10', 'alto-k10'),
    ('maruti-suzuki', 'S-Presso', 's-presso'),
    ('maruti-suzuki', 'Wagon R', 'wagon-r'),
    ('maruti-suzuki', 'Celerio', 'celerio'),
    ('maruti-suzuki', 'Swift', 'swift'),
    ('maruti-suzuki', 'Dzire', 'dzire'),
    ('maruti-suzuki', 'Baleno', 'baleno'),
    ('maruti-suzuki', 'Ignis', 'ignis'),
    ('maruti-suzuki', 'Ciaz', 'ciaz'),
    ('maruti-suzuki', 'Ertiga', 'ertiga'),
    ('maruti-suzuki', 'XL6', 'xl6'),
    ('maruti-suzuki', 'Vitara Brezza', 'vitara-brezza'),
    ('maruti-suzuki', 'Brezza', 'brezza'),
    ('maruti-suzuki', 'Fronx', 'fronx'),
    ('maruti-suzuki', 'Grand Vitara', 'grand-vitara'),
    ('maruti-suzuki', 'Jimny', 'jimny'),
    ('maruti-suzuki', 'S-Cross', 's-cross'),

    ('hyundai', 'Santro', 'santro'),
    ('hyundai', 'Grand i10', 'grand-i10'),
    ('hyundai', 'Grand i10 Nios', 'grand-i10-nios'),
    ('hyundai', 'i20', 'i20'),
    ('hyundai', 'Aura', 'aura'),
    ('hyundai', 'Xcent', 'xcent'),
    ('hyundai', 'Exter', 'exter'),
    ('hyundai', 'Venue', 'venue'),
    ('hyundai', 'Verna', 'verna'),
    ('hyundai', 'Creta', 'creta'),
    ('hyundai', 'Alcazar', 'alcazar'),
    ('hyundai', 'Tucson', 'tucson'),
    ('hyundai', 'Kona Electric', 'kona-electric'),

    ('tata', 'Tiago', 'tiago'),
    ('tata', 'Tigor', 'tigor'),
    ('tata', 'Altroz', 'altroz'),
    ('tata', 'Punch', 'punch'),
    ('tata', 'Nexon', 'nexon'),
    ('tata', 'Nexon EV', 'nexon-ev'),
    ('tata', 'Tiago EV', 'tiago-ev'),
    ('tata', 'Harrier', 'harrier'),
    ('tata', 'Safari', 'safari'),
    ('tata', 'Curvv', 'curvv'),

    ('mahindra', 'Bolero', 'bolero'),
    ('mahindra', 'Bolero Neo', 'bolero-neo'),
    ('mahindra', 'KUV100', 'kuv100'),
    ('mahindra', 'XUV300', 'xuv300'),
    ('mahindra', 'XUV 3XO', 'xuv-3xo'),
    ('mahindra', 'XUV400', 'xuv400'),
    ('mahindra', 'XUV500', 'xuv500'),
    ('mahindra', 'XUV700', 'xuv700'),
    ('mahindra', 'Scorpio Classic', 'scorpio-classic'),
    ('mahindra', 'Scorpio-N', 'scorpio-n'),
    ('mahindra', 'Thar', 'thar'),
    ('mahindra', 'Marazzo', 'marazzo'),

    ('kia', 'Sonet', 'sonet'),
    ('kia', 'Syros', 'syros'),
    ('kia', 'Seltos', 'seltos'),
    ('kia', 'Carens', 'carens'),
    ('kia', 'Carnival', 'carnival'),
    ('kia', 'EV6', 'ev6'),

    ('toyota', 'Etios Liva', 'etios-liva'),
    ('toyota', 'Etios', 'etios'),
    ('toyota', 'Glanza', 'glanza'),
    ('toyota', 'Yaris', 'yaris'),
    ('toyota', 'Urban Cruiser Hyryder', 'urban-cruiser-hyryder'),
    ('toyota', 'Rumion', 'rumion'),
    ('toyota', 'Innova Crysta', 'innova-crysta'),
    ('toyota', 'Innova Hycross', 'innova-hycross'),
    ('toyota', 'Corolla Altis', 'corolla-altis'),
    ('toyota', 'Camry', 'camry'),
    ('toyota', 'Fortuner', 'fortuner'),

    ('honda', 'Brio', 'brio'),
    ('honda', 'Jazz', 'jazz'),
    ('honda', 'Amaze', 'amaze'),
    ('honda', 'City', 'city'),
    ('honda', 'WR-V', 'wr-v'),
    ('honda', 'BR-V', 'br-v'),
    ('honda', 'Elevate', 'elevate'),
    ('honda', 'Civic', 'civic'),

    ('mg', 'Comet EV', 'comet-ev'),
    ('mg', 'Astor', 'astor'),
    ('mg', 'Hector', 'hector'),
    ('mg', 'Hector Plus', 'hector-plus'),
    ('mg', 'ZS EV', 'zs-ev'),
    ('mg', 'Windsor EV', 'windsor-ev'),
    ('mg', 'Gloster', 'gloster'),

    ('skoda', 'Rapid', 'rapid'),
    ('skoda', 'Slavia', 'slavia'),
    ('skoda', 'Kylaq', 'kylaq'),
    ('skoda', 'Kushaq', 'kushaq'),
    ('skoda', 'Octavia', 'octavia'),
    ('skoda', 'Superb', 'superb'),
    ('skoda', 'Kodiaq', 'kodiaq'),

    ('volkswagen', 'Polo', 'polo'),
    ('volkswagen', 'Ameo', 'ameo'),
    ('volkswagen', 'Vento', 'vento'),
    ('volkswagen', 'Virtus', 'virtus'),
    ('volkswagen', 'Taigun', 'taigun'),
    ('volkswagen', 'Tiguan', 'tiguan'),

    ('bmw', '2 Series Gran Coupe', '2-series-gran-coupe'),
    ('bmw', '3 Series', '3-series'),
    ('bmw', '3 Series Gran Limousine', '3-series-gran-limousine'),
    ('bmw', '5 Series', '5-series'),
    ('bmw', '7 Series', '7-series'),
    ('bmw', 'X1', 'x1'),
    ('bmw', 'X3', 'x3'),
    ('bmw', 'X5', 'x5'),
    ('bmw', 'X7', 'x7'),

    ('mercedes-benz', 'A-Class Limousine', 'a-class-limousine'),
    ('mercedes-benz', 'C-Class', 'c-class'),
    ('mercedes-benz', 'E-Class', 'e-class'),
    ('mercedes-benz', 'S-Class', 's-class'),
    ('mercedes-benz', 'GLA', 'gla'),
    ('mercedes-benz', 'GLC', 'glc'),
    ('mercedes-benz', 'GLE', 'gle'),
    ('mercedes-benz', 'GLS', 'gls')
) as m (brand_slug, name, slug)
join public.brands b on b.slug = m.brand_slug
on conflict (brand_id, slug) do nothing;

-- ===========================================================================
-- Part 2: SAMPLE cars (is_sample = true). Not real stock.
-- ===========================================================================
-- Covers every public state: published (incl. featured and new arrivals),
-- reserved, sold and draft. No photos are seeded, so the UI's no-image
-- fallback is exercised too.

insert into public.cars (
  brand_id, model_id, variant, slug, price, original_price, year, kms_driven,
  fuel_type, transmission, body_type, engine_cc, owners, color,
  registration_state, registration_city, description, status, featured,
  is_sample, published_at, sold_at
)
select
  b.id, m.id, c.variant, c.slug, c.price, c.original_price, c.year, c.kms_driven,
  c.fuel_type::public.fuel_type, c.transmission::public.transmission,
  c.body_type::public.body_type, c.engine_cc, c.owners, c.color,
  'TS', c.city,
  'SAMPLE LISTING (demo data, not a real car). ' || c.description,
  c.status::public.car_status, c.featured,
  true, now() - c.published_days_ago * interval '1 day',
  case when c.status = 'sold' then now() - interval '2 days' end
from (
  values
    (
      'hyundai', 'creta', 'SX (O) 1.5 Diesel AT', '2021-hyundai-creta-sx-o-diesel-at',
      1475000, 1595000, 2021, 42000, 'diesel', 'torque_converter', 'suv', 1493, 1,
      'Polar White', 'Hyderabad',
      'Single owner, driven mostly within the city. Panoramic sunroof, ventilated front seats and a full service record at the authorised dealer.',
      'published', true, 5
    ),
    (
      'maruti-suzuki', 'swift', 'ZXi Plus', '2020-maruti-suzuki-swift-zxi-plus',
      595000, null, 2020, 38500, 'petrol', 'manual', 'hatchback', 1197, 1,
      'Solid Fire Red', 'Hyderabad',
      'Top-spec Swift with touchscreen infotainment, push-button start and LED projector headlamps. Tyres replaced last year.',
      'published', false, 21
    ),
    (
      'tata', 'nexon', 'XZ Plus Petrol', '2022-tata-nexon-xz-plus-petrol',
      890000, null, 2022, 24000, 'petrol', 'manual', 'suv', 1199, 1,
      'Flame Red', 'Secunderabad',
      'Low-running Nexon with sunroof, reverse camera and automatic climate control. Always garaged.',
      'published', false, 3
    ),
    (
      'honda', 'city', 'VX CVT', '2019-honda-city-vx-cvt',
      825000, 875000, 2019, 61000, 'petrol', 'cvt', 'sedan', 1497, 2,
      'Golden Brown Metallic', 'Hyderabad',
      'Smooth CVT automatic with paddle shifters, sunroof and cruise control. Second owner, well maintained.',
      'published', false, 40
    ),
    (
      'mahindra', 'xuv700', 'AX7 Diesel AT', '2022-mahindra-xuv700-ax7-diesel-at',
      2150000, null, 2022, 35000, 'diesel', 'torque_converter', 'suv', 2184, 1,
      'Midnight Black', 'Hyderabad',
      'Seven-seater with ADAS, dual 10.25-inch screens and a panoramic sunroof.',
      'reserved', true, 12
    ),
    (
      'toyota', 'innova-crysta', '2.4 VX 7 Seater', '2021-toyota-innova-crysta-2-4-vx-7-seater',
      1975000, null, 2021, 68000, 'diesel', 'manual', 'muv', 2393, 1,
      'Silver Metallic', 'Hyderabad',
      'Family-used Innova Crysta with captain seats in the second row. Regular servicing.',
      'published', true, 9
    ),
    (
      'kia', 'seltos', 'HTX IVT', '2023-kia-seltos-htx-ivt',
      1540000, null, 2023, 18000, 'petrol', 'cvt', 'suv', 1497, 1,
      'Gravity Grey', 'Hyderabad',
      'Nearly new Seltos with IVT automatic, sunroof and connected car features.',
      'sold', false, 30
    ),
    (
      'bmw', '3-series', '320d Luxury Line', '2020-bmw-3-series-320d-luxury-line',
      3650000, null, 2020, 45000, 'diesel', 'torque_converter', 'luxury', 1995, 2,
      'Mineral White', 'Hyderabad',
      '320d with 8-speed automatic, leather upholstery and a sunroof. Listing still being prepared.',
      'draft', false, null
    )
) as c (
  brand_slug, model_slug, variant, slug, price, original_price, year, kms_driven,
  fuel_type, transmission, body_type, engine_cc, owners, color, city,
  description, status, featured, published_days_ago
)
join public.brands b on b.slug = c.brand_slug
join public.models m on m.brand_id = b.id and m.slug = c.model_slug
on conflict (slug) do nothing;

insert into public.car_features (car_id, feature_name)
select cars.id, f.feature_name
from (
  values
    ('2021-hyundai-creta-sx-o-diesel-at', 'Sunroof'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Ventilated Seats'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Reverse Camera'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Apple CarPlay'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Android Auto'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Cruise Control'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Push Start'),
    ('2021-hyundai-creta-sx-o-diesel-at', 'Alloy Wheels'),
    ('2021-hyundai-creta-sx-o-diesel-at', '6 Airbags'),

    ('2020-maruti-suzuki-swift-zxi-plus', 'Apple CarPlay'),
    ('2020-maruti-suzuki-swift-zxi-plus', 'Android Auto'),
    ('2020-maruti-suzuki-swift-zxi-plus', 'Push Start'),
    ('2020-maruti-suzuki-swift-zxi-plus', 'Alloy Wheels'),
    ('2020-maruti-suzuki-swift-zxi-plus', 'Dual Airbags'),

    ('2022-tata-nexon-xz-plus-petrol', 'Sunroof'),
    ('2022-tata-nexon-xz-plus-petrol', 'Reverse Camera'),
    ('2022-tata-nexon-xz-plus-petrol', 'Apple CarPlay'),
    ('2022-tata-nexon-xz-plus-petrol', 'Android Auto'),
    ('2022-tata-nexon-xz-plus-petrol', 'Automatic Climate Control'),
    ('2022-tata-nexon-xz-plus-petrol', 'Push Start'),

    ('2019-honda-city-vx-cvt', 'Sunroof'),
    ('2019-honda-city-vx-cvt', 'Cruise Control'),
    ('2019-honda-city-vx-cvt', 'Paddle Shifters'),
    ('2019-honda-city-vx-cvt', 'Reverse Camera'),
    ('2019-honda-city-vx-cvt', 'Push Start'),
    ('2019-honda-city-vx-cvt', 'Alloy Wheels'),

    ('2022-mahindra-xuv700-ax7-diesel-at', 'Sunroof'),
    ('2022-mahindra-xuv700-ax7-diesel-at', 'ADAS'),
    ('2022-mahindra-xuv700-ax7-diesel-at', '360 Camera'),
    ('2022-mahindra-xuv700-ax7-diesel-at', 'Apple CarPlay'),
    ('2022-mahindra-xuv700-ax7-diesel-at', 'Android Auto'),
    ('2022-mahindra-xuv700-ax7-diesel-at', 'Cruise Control'),
    ('2022-mahindra-xuv700-ax7-diesel-at', '7 Airbags'),

    ('2021-toyota-innova-crysta-2-4-vx-7-seater', 'Captain Seats'),
    ('2021-toyota-innova-crysta-2-4-vx-7-seater', 'Reverse Camera'),
    ('2021-toyota-innova-crysta-2-4-vx-7-seater', 'Automatic Climate Control'),
    ('2021-toyota-innova-crysta-2-4-vx-7-seater', 'Push Start'),

    ('2023-kia-seltos-htx-ivt', 'Sunroof'),
    ('2023-kia-seltos-htx-ivt', 'Reverse Camera'),
    ('2023-kia-seltos-htx-ivt', 'Apple CarPlay'),
    ('2023-kia-seltos-htx-ivt', 'Android Auto'),

    ('2020-bmw-3-series-320d-luxury-line', 'Sunroof'),
    ('2020-bmw-3-series-320d-luxury-line', 'Leather Seats'),
    ('2020-bmw-3-series-320d-luxury-line', 'Cruise Control'),
    ('2020-bmw-3-series-320d-luxury-line', 'Reverse Camera')
) as f (car_slug, feature_name)
join public.cars on cars.slug = f.car_slug and cars.is_sample
on conflict (car_id, feature_name) do nothing;

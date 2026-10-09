import { Constants, type Database } from '@/lib/database.types';

/**
 * Display labels for the car enums, plus the suggestion lists the admin car
 * form offers. The enum values themselves come from the generated types, so
 * a new enum value in the database is a type error here until it is labelled.
 */

type Enums = Database['public']['Enums'];
export type CarStatus = Enums['car_status'];
export type FuelType = Enums['fuel_type'];
export type Transmission = Enums['transmission'];
export type BodyType = Enums['body_type'];

export const FUEL_TYPES = Constants.public.Enums.fuel_type;
export const TRANSMISSIONS = Constants.public.Enums.transmission;
export const BODY_TYPES = Constants.public.Enums.body_type;
export const CAR_STATUSES = Constants.public.Enums.car_status;

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

/** Admin labels. The public site shows every type except manual as "Automatic". */
export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  amt: 'AMT',
  cvt: 'CVT',
  dct: 'DCT',
  torque_converter: 'Torque converter',
};

export function isAutomatic(transmission: Transmission) {
  return transmission !== 'manual';
}

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  muv: 'MUV',
  coupe: 'Coupe',
  convertible: 'Convertible',
  luxury: 'Luxury',
};

/** Checkbox grid on the car form. Staff can add anything else as a custom feature. */
export const COMMON_FEATURES = [
  'Sunroof',
  'Panoramic Sunroof',
  'Reverse Camera',
  '360° Camera',
  'Parking Sensors',
  'Apple CarPlay',
  'Android Auto',
  'Touchscreen Infotainment',
  'Cruise Control',
  'Push Button Start',
  'Keyless Entry',
  'Alloy Wheels',
  'Automatic Climate Control',
  'Rear AC Vents',
  'Ventilated Seats',
  'Leather Seats',
  'Power Windows',
  'Electric ORVMs',
  'ABS',
  'Electronic Stability Control',
  'Hill Assist',
  'ISOFIX Child Seat Mounts',
  'LED Headlamps',
  'Wireless Charging',
  'Connected Car Tech',
] as const;

/** Stored as a feature named e.g. "6 Airbags". */
export const AIRBAG_COUNTS = [1, 2, 4, 6, 7, 8, 9, 10] as const;
const AIRBAGS_PATTERN = /^(\d{1,2}) Airbags?$/;

export function airbagsFeature(count: number) {
  return count === 1 ? '1 Airbag' : `${count} Airbags`;
}

export function parseAirbagsFeature(feature: string): number | null {
  const match = AIRBAGS_PATTERN.exec(feature);
  return match ? Number(match[1]) : null;
}

export const COLOUR_SUGGESTIONS = [
  'White',
  'Pearl White',
  'Silver',
  'Grey',
  'Black',
  'Red',
  'Blue',
  'Brown',
  'Beige',
  'Orange',
  'Green',
  'Yellow',
  'Maroon',
  'Gold',
];

/** Vehicle registration state codes, most common for a Hyderabad dealer first. */
export const REGISTRATION_STATES = [
  'TS',
  'AP',
  'KA',
  'TN',
  'MH',
  'KL',
  'DL',
  'GJ',
  'RJ',
  'UP',
  'WB',
  'MP',
  'OD',
  'PB',
  'HR',
  'CG',
  'BR',
  'JH',
  'GA',
];

export const DEFAULT_REGISTRATION = { state: 'TS', city: 'Hyderabad' } as const;

export const OWNER_LABELS: Record<number, string> = {
  1: '1st owner',
  2: '2nd owner',
  3: '3rd owner',
  4: '4th owner',
  5: '5th owner',
  6: '6th owner or more',
};

export const MIN_CAR_YEAR = 1980;

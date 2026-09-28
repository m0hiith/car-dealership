import { isAutomatic, type FuelType, type Transmission } from './car-options';

export const SLUG_MAX_LENGTH = 120;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Mercedes-Benz GLA 200 d" -> "mercedes-benz-gla-200-d". */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(slug: string, max = SLUG_MAX_LENGTH) {
  return slug.length <= max ? slug : slug.slice(0, max).replace(/-+$/, '');
}

export type CarSlugParts = {
  year?: number | null;
  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  fuelType?: FuelType | null;
  transmission?: Transmission | null;
};

// Indian trim names spell out the gearbox in the abbreviated form ("SX (O)
// 1.5 Diesel AT"), not the word buildCarSlug would otherwise add.
const AUTOMATIC_WORDS = new Set(['automatic', 'at', 'cvt', 'amt', 'dct', 'ivt']);
const MANUAL_WORDS = new Set(['manual', 'mt']);

/**
 * SEO slug for a car, never containing its id:
 * 2022 Hyundai Creta SX, petrol, automatic -> "2022-hyundai-creta-sx-petrol-automatic".
 * Fuel and gearbox are skipped when the variant already says them
 * ("SX Petrol AT" does not become "...-sx-petrol-at-automatic").
 */
export function buildCarSlug({ year, brand, model, variant, fuelType, transmission }: CarSlugParts): string {
  const base = [year, brand, model, variant].filter(Boolean).join(' ');
  const words = new Set(slugify(base).split('-'));
  const extras: string[] = [];
  if (fuelType && !words.has(fuelType)) extras.push(fuelType);
  if (transmission) {
    const automatic = isAutomatic(transmission);
    const gearboxWords = automatic ? AUTOMATIC_WORDS : MANUAL_WORDS;
    if (![...words].some((word) => gearboxWords.has(word))) extras.push(automatic ? 'automatic' : 'manual');
  }
  return clamp(slugify([base, ...extras].join(' ')));
}

/**
 * Addresses to try for a car, most readable first: the details alone, then
 * with the colour, so two Swift VXi cars become "...-vxi-petrol-manual" and
 * "...-vxi-petrol-manual-red" rather than "-2".
 */
export function carSlugCandidates(base: string, colour?: string | null): string[] {
  const out = [base];
  const tail = colour ? slugify(colour) : '';
  if (tail && !base.endsWith(`-${tail}`)) out.push(withSlugTail(base, tail));
  return out;
}

/** "2022-hyundai-creta" + "red" -> "2022-hyundai-creta-red", staying within the length limit. */
export function withSlugTail(slug: string, tail: string): string {
  const suffix = `-${tail}`;
  return `${clamp(slug, SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
}

// No 0/o, 1/l/i: the code may be read out over the phone.
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Four random characters ("k7p2") for the rare car whose details and colour
 * match another's. Random, so it never reveals a database id or a count.
 */
export function randomSlugCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return code;
}

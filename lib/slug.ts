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

/**
 * SEO slug for a car, never containing its id:
 * 2022 Hyundai Creta SX, petrol, automatic -> "2022-hyundai-creta-sx-petrol-automatic".
 * Fuel and gearbox are skipped when the variant already says them
 * ("SX Petrol AT" does not become "...-sx-petrol-at-petrol-automatic").
 */
export function buildCarSlug({ year, brand, model, variant, fuelType, transmission }: CarSlugParts): string {
  const base = [year, brand, model, variant].filter(Boolean).join(' ');
  const words = new Set(slugify(base).split('-'));
  const extras: string[] = [];
  if (fuelType && !words.has(fuelType)) extras.push(fuelType);
  if (transmission) {
    const gearbox = isAutomatic(transmission) ? 'automatic' : 'manual';
    if (!words.has(gearbox)) extras.push(gearbox);
  }
  return clamp(slugify([base, ...extras].join(' ')));
}

/** "2022-hyundai-creta" + 2 -> "2022-hyundai-creta-2", staying within the length limit. */
export function withSlugSuffix(slug: string, n: number): string {
  const suffix = `-${n}`;
  return `${clamp(slug, SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
}

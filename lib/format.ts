/**
 * Display formatting for prices, distances and dates (CLAUDE.md §4).
 * All amounts are whole rupees.
 */

const LAKH = 100_000;
const CRORE = 10_000_000;

const indianInteger = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const upToTwoDecimals = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function assertAmount(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number (got ${value})`);
  }
}

/** Rounds to 2 decimals without float artefacts (e.g. 15.255 -> 15.26). */
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compact price for cards and listings.
 * 450000 -> "₹4.5 Lakh", 1525000 -> "₹15.25 Lakh", 10000000 -> "₹1 Crore".
 * Amounts under 1 lakh fall back to the full figure ("₹85,000").
 */
export function formatPriceLakh(rupees: number): string {
  assertAmount(rupees, 'Price');
  if (rupees < LAKH) return formatPriceFull(rupees);

  const lakh = round2(rupees / LAKH);
  // 99,99,999 rounds to 100 Lakh; show it as crore instead.
  if (lakh < 100) return `₹${upToTwoDecimals.format(lakh)} Lakh`;

  return `₹${upToTwoDecimals.format(round2(rupees / CRORE))} Crore`;
}

/** Full price with Indian digit grouping for detail pages: 1525000 -> "₹15,25,000". */
export function formatPriceFull(rupees: number): string {
  assertAmount(rupees, 'Price');
  return `₹${indianInteger.format(Math.round(rupees))}`;
}

/** Odometer reading: 32000 -> "32,000 km", 100000 -> "1,00,000 km". */
export function formatKm(km: number): string {
  assertAmount(km, 'Kilometres');
  return `${indianInteger.format(Math.round(km))} km`;
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Calendar date in Asia/Kolkata: "26 Sept 2026". */
export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date: ${String(value)}`);
  return dateFormatter.format(date);
}

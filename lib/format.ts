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

const KOLKATA = 'Asia/Kolkata';
const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: KOLKATA,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const weekdayFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: KOLKATA, weekday: 'short' });
const dayMonthFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: KOLKATA, day: 'numeric', month: 'short' });
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KOLKATA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Days since 1970 of the Asia/Kolkata calendar date, so "yesterday" follows India's midnight. */
function kolkataDay(date: Date) {
  return Date.parse(`${dayKeyFormatter.format(date)}T00:00:00Z`) / 86_400_000;
}

/**
 * Friendly timestamp in Asia/Kolkata for lists such as leads:
 * "Today 8:42 PM", "Yesterday 8:42 PM", "Mon 8:42 PM" (this week),
 * "26 Sept, 8:42 PM" (this year), else "26 Sept 2025".
 */
export function formatRelativeDateTime(value: Date | string, now: Date | number = Date.now()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date: ${String(value)}`);
  const today = new Date(now);
  const days = kolkataDay(today) - kolkataDay(date);
  // en-IN writes "pm"; show "PM".
  const time = timeFormatter.format(date).replace(/\s?([ap])m$/i, (_, p: string) => ` ${p.toUpperCase()}M`);

  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  if (days > 1 && days < 7) return `${weekdayFormatter.format(date)} ${time}`;
  if (dayKeyFormatter.format(date).slice(0, 4) === dayKeyFormatter.format(today).slice(0, 4)) {
    return `${dayMonthFormatter.format(date)}, ${time}`;
  }
  return formatDate(date);
}

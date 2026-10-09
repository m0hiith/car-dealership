/**
 * Optional "about you" answers on the enquiry form, stored on leads to help
 * staff prioritise. Keys match the leads table checks.
 */

export const BUDGET_RANGES = {
  under_5l: 'Under ₹5 Lakh',
  '5_10l': '₹5–10 Lakh',
  '10_20l': '₹10–20 Lakh',
  '20l_plus': '₹20 Lakh and above',
} as const;
export type BudgetRange = keyof typeof BUDGET_RANGES;
export const BUDGET_RANGE_KEYS = Object.keys(BUDGET_RANGES) as [BudgetRange, ...BudgetRange[]];

export const BUYING_TIMELINES = {
  immediately: 'Right away',
  this_month: 'Within a month',
  '1_3_months': 'In 1–3 months',
  browsing: 'Just looking',
} as const;
export type BuyingTimeline = keyof typeof BUYING_TIMELINES;
export const BUYING_TIMELINE_KEYS = Object.keys(BUYING_TIMELINES) as [BuyingTimeline, ...BuyingTimeline[]];

/** Exchange car answer as the form sends it. */
export const EXCHANGE_OPTIONS = { yes: 'Yes, I have a car to exchange', no: 'No' } as const;

export function isBudgetRange(v: string | null): v is BudgetRange {
  return v !== null && v in BUDGET_RANGES;
}
export function isBuyingTimeline(v: string | null): v is BuyingTimeline {
  return v !== null && v in BUYING_TIMELINES;
}

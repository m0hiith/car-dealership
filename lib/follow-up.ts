import { z } from 'zod';

/**
 * Follow-up times for leads and sell requests. The dealer works in
 * Hyderabad, so "today", "tomorrow at 10" and datetime-local inputs are all
 * Asia/Kolkata. India has no daylight saving, so a fixed +05:30 is exact.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Callbacks asked for "tomorrow" etc. land at the start of the working day. */
const MORNING_HOUR = 10;
const EVENING_HOUR = 18;
/** How far ahead a customer may pick a date. */
export const MAX_PICK_DAYS = 60;

/** Midnight at the start of the Kolkata day containing `ms`, as a UTC timestamp. */
function kolkataMidnight(ms: number): number {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** `hour`:00 Kolkata time, `days` days after today. */
function kolkataAt(now: number, days: number, hour: number): number {
  return kolkataMidnight(now) + days * DAY_MS + hour * 60 * 60 * 1000;
}

/** The end of today in Kolkata (next midnight): follow-ups before this are "today or overdue". */
export function endOfKolkataDay(now: number): number {
  return kolkataMidnight(now) + DAY_MS;
}

/** Today's date in Kolkata as YYYY-MM-DD, `days` ahead (for date input min/max). */
export function kolkataDateValue(now: number, days = 0): string {
  return new Date(kolkataMidnight(now) + days * DAY_MS + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public enquiry form: "When should we call you?"
// ---------------------------------------------------------------------------

export const CALL_WHEN = {
  now: 'Now',
  today_evening: 'Today evening',
  tomorrow: 'Tomorrow',
  in_2_days: 'In 2 days',
  in_week: 'In a week',
  pick: 'Pick a date',
} as const;
export type CallWhen = keyof typeof CALL_WHEN;
export const CALL_WHEN_KEYS = Object.keys(CALL_WHEN) as [CallWhen, ...CallWhen[]];

/** The follow-up time for a customer's choice. Never in the past. */
export function followUpForChoice(choice: CallWhen, now: number, pickedDate?: string): Date {
  let at: number;
  switch (choice) {
    case 'now':
      at = now;
      break;
    case 'today_evening':
      at = kolkataAt(now, 0, EVENING_HOUR);
      break;
    case 'tomorrow':
      at = kolkataAt(now, 1, MORNING_HOUR);
      break;
    case 'in_2_days':
      at = kolkataAt(now, 2, MORNING_HOUR);
      break;
    case 'in_week':
      at = kolkataAt(now, 7, MORNING_HOUR);
      break;
    case 'pick': {
      if (!pickedDate || !/^\d{4}-\d{2}-\d{2}$/.test(pickedDate)) throw new RangeError('A date is required.');
      at = Date.parse(`${pickedDate}T${String(MORNING_HOUR).padStart(2, '0')}:00:00+05:30`);
      break;
    }
  }
  return new Date(Math.max(at, now));
}

/** True for a YYYY-MM-DD from today to MAX_PICK_DAYS ahead, in Kolkata. */
export function isPickableDate(value: string, now: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00+05:30`))) return false;
  return value >= kolkataDateValue(now) && value <= kolkataDateValue(now, MAX_PICK_DAYS);
}

// ---------------------------------------------------------------------------
// Admin: datetime-local inputs, quick buttons and display
// ---------------------------------------------------------------------------

/** An ISO time as the value of a datetime-local input, in Kolkata. */
export function toKolkataInputValue(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** A datetime-local value typed in Kolkata time, as an ISO timestamp; null if malformed. */
export function fromKolkataInputValue(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}:00+05:30`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Quick buttons: this many days from now, to the minute. */
export function inDays(now: number, days: number): string {
  return toKolkataInputValue(new Date(Math.floor((now + days * DAY_MS) / 60_000) * 60_000).toISOString());
}

export type FollowUpState = 'overdue' | 'today' | 'later';

export function followUpState(iso: string, now: number): FollowUpState {
  const at = Date.parse(iso);
  if (at <= now) return 'overdue';
  return at < endOfKolkataDay(now) ? 'today' : 'later';
}

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const weekdayFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

/** "Today 6:00 PM", "Tomorrow 10:00 AM", "Yesterday 4:30 PM", "Fri 10:00 AM", "26 Sept, 10:00 AM". */
export function formatFollowUp(iso: string, now: number): string {
  const at = new Date(iso);
  // en-IN writes "pm"; show "PM", as formatRelativeDateTime does.
  const time = timeFormatter.format(at).replace(/\s?([ap])m$/i, (_, p: string) => ` ${p.toUpperCase()}M`);
  const days = Math.round((kolkataMidnight(at.getTime()) - kolkataMidnight(now)) / DAY_MS);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  if (days === -1) return `Yesterday ${time}`;
  if (days > 1 && days < 7) return `${weekdayFormatter.format(at)} ${time}`;
  return `${dateFormatter.format(at)}, ${time}`;
}

// ---------------------------------------------------------------------------
// Staff actions
// ---------------------------------------------------------------------------

export const FOLLOW_UP_KINDS = ['lead', 'sell'] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export const followUpSaveSchema = z.object({
  kind: z.enum(FOLLOW_UP_KINDS),
  id: z.uuid(),
  at: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const iso = fromKolkataInputValue(v);
      if (!iso) {
        ctx.addIssue({ code: 'custom', message: 'Choose a date and time.' });
        return z.NEVER;
      }
      return iso;
    }),
  note: z
    .string()
    .trim()
    .max(500, { error: 'Keep the note under 500 characters.' })
    .transform((v) => v || null),
});

export type FollowUpSaveInput = z.input<typeof followUpSaveSchema>;

export const followUpTargetSchema = z.object({ kind: z.enum(FOLLOW_UP_KINDS), id: z.uuid() });

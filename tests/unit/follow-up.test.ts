import { describe, expect, it, vi } from 'vitest';
import {
  endOfKolkataDay,
  followUpForChoice,
  followUpSaveSchema,
  followUpState,
  formatFollowUp,
  fromKolkataInputValue,
  inDays,
  isPickableDate,
  kolkataDateValue,
  toKolkataInputValue,
} from '@/lib/follow-up';
import { buildFollowUpReminderEmail } from '@/lib/notifications/follow-up-email';
import { leadSchema } from '@/lib/validation/lead';

vi.mock('server-only', () => ({}));

// Wed 7 Oct 2026, 2:00 PM in Hyderabad (08:30 UTC).
const NOW = Date.parse('2026-10-07T14:00:00+05:30');
const ist = (local: string) => new Date(`${local}+05:30`).toISOString();

describe('followUpForChoice', () => {
  it.each([
    ['now', ist('2026-10-07T14:00:00')],
    ['today_evening', ist('2026-10-07T18:00:00')],
    ['tomorrow', ist('2026-10-08T10:00:00')],
    ['in_2_days', ist('2026-10-09T10:00:00')],
    ['in_week', ist('2026-10-14T10:00:00')],
  ] as const)('%s → %s', (choice, expected) => {
    expect(followUpForChoice(choice, NOW).toISOString()).toBe(expected);
  });

  it('uses 10 AM on a picked date', () => {
    expect(followUpForChoice('pick', NOW, '2026-10-20').toISOString()).toBe(ist('2026-10-20T10:00:00'));
  });

  it('never returns a time in the past', () => {
    const lateEvening = Date.parse('2026-10-07T21:30:00+05:30');
    expect(followUpForChoice('today_evening', lateEvening).getTime()).toBe(lateEvening);
    expect(followUpForChoice('pick', NOW, '2026-10-07').getTime()).toBe(NOW);
  });

  it('counts days from the Kolkata date, not the UTC one', () => {
    // 12:30 AM on 8 Oct in Hyderabad is still 7 Oct in UTC.
    const justAfterMidnight = Date.parse('2026-10-08T00:30:00+05:30');
    expect(followUpForChoice('tomorrow', justAfterMidnight).toISOString()).toBe(ist('2026-10-09T10:00:00'));
    expect(kolkataDateValue(justAfterMidnight)).toBe('2026-10-08');
  });
});

describe('isPickableDate', () => {
  it.each([
    ['2026-10-07', true],
    ['2026-12-06', true],
    ['2026-10-06', false],
    ['2026-12-07', false],
    ['07-10-2026', false],
    ['2026-02-30x', false],
  ])('%s → %s', (value, expected) => {
    expect(isPickableDate(value, NOW)).toBe(expected);
  });
});

describe('datetime-local values', () => {
  it('round-trips through Kolkata time', () => {
    const iso = fromKolkataInputValue('2026-10-09T15:30');
    expect(iso).toBe('2026-10-09T10:00:00.000Z');
    expect(toKolkataInputValue(iso)).toBe('2026-10-09T15:30');
    expect(fromKolkataInputValue('tomorrow')).toBeNull();
    expect(toKolkataInputValue(null)).toBe('');
  });

  it('quick buttons add whole days from now', () => {
    expect(inDays(NOW, 1)).toBe('2026-10-08T14:00');
    expect(inDays(NOW, 7)).toBe('2026-10-14T14:00');
  });

  it('validates a staff follow-up', () => {
    const id = '0b6e5d0e-1f7c-4c55-9a51-0f4c4a2b9d11';
    expect(followUpSaveSchema.parse({ kind: 'lead', id, at: '2026-10-09T15:30', note: ' ' }).note).toBeNull();
    expect(followUpSaveSchema.safeParse({ kind: 'lead', id, at: '', note: '' }).success).toBe(false);
    expect(followUpSaveSchema.safeParse({ kind: 'car', id, at: '2026-10-09T15:30', note: '' }).success).toBe(false);
  });
});

describe('followUpState and formatFollowUp', () => {
  it('splits overdue, later today and later', () => {
    expect(followUpState(ist('2026-10-07T09:00:00'), NOW)).toBe('overdue');
    expect(followUpState(ist('2026-10-07T23:59:00'), NOW)).toBe('today');
    expect(followUpState(ist('2026-10-08T00:00:00'), NOW)).toBe('later');
    expect(endOfKolkataDay(NOW)).toBe(Date.parse(ist('2026-10-08T00:00:00')));
  });

  it.each([
    ['2026-10-07T18:00:00', 'Today 6:00 PM'],
    ['2026-10-08T10:00:00', 'Tomorrow 10:00 AM'],
    ['2026-10-06T16:30:00', 'Yesterday 4:30 PM'],
    ['2026-10-09T10:00:00', 'Fri 10:00 AM'],
  ])('%s → %s', (local, expected) => {
    expect(formatFollowUp(ist(local), NOW)).toBe(expected);
  });
});

describe('lead form "When should we call you?"', () => {
  const base = { name: 'Ravi', phone: '9876543210' };
  it('is optional and only accepts known choices', () => {
    expect(leadSchema.parse({ ...base, callWhen: '' }).callWhen).toBeUndefined();
    expect(leadSchema.parse({ ...base, callWhen: 'tomorrow' }).callWhen).toBe('tomorrow');
    expect(leadSchema.safeParse({ ...base, callWhen: 'someday' }).success).toBe(false);
  });
});

describe('buildFollowUpReminderEmail', () => {
  it('lists each follow-up with a link and escapes what customers typed', () => {
    const { subject, text, html } = buildFollowUpReminderEmail(
      [
        {
          kind: 'lead',
          id: 'a',
          name: '<b>Ravi</b>',
          phone: '9876543210',
          subject: '2021 Hyundai Creta',
          at: ist('2026-10-07T13:00:00'),
          note: null,
        },
        {
          kind: 'sell',
          id: '0b6e5d0e-1f7c-4c55-9a51-0f4c4a2b9d11',
          name: 'Priya',
          phone: '9123456780',
          subject: 'Selling 2019 Honda City',
          at: ist('2026-10-07T14:00:00'),
          note: 'Call after 6',
        },
      ],
      'Test Motors',
      NOW,
    );
    expect(subject).toBe('2 follow-ups due');
    expect(text).toContain('Today 1:00 PM – <b>Ravi</b>, 98765 43210');
    expect(text).toContain('/admin/sell-requests/0b6e5d0e-1f7c-4c55-9a51-0f4c4a2b9d11');
    expect(html).not.toContain('<b>Ravi</b>');
    expect(html).toContain('&lt;b&gt;Ravi&lt;/b&gt;');
  });
});

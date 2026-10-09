import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { runFollowUpReminders } from '@/lib/follow-up-reminders';

// Follow-up reminder job. Vercel Cron calls it every 15 minutes (vercel.json)
// with "Authorization: Bearer $CRON_SECRET"; any other scheduler can do the
// same. A Route Handler because there is no form or page here (CLAUDE.md §2).

export const dynamic = 'force-dynamic';

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse to run with no secret, or a guessable one.
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runFollowUpReminders());
  } catch (e) {
    console.error('Follow-up reminder job failed', { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: 'Reminder job failed' }, { status: 500 });
  }
}

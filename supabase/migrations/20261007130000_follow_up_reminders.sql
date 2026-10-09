-- Follow-up reminders for leads and sell requests.
--
-- follow_up_at:   when staff should next contact the customer (null = none).
-- follow_up_note: what the follow-up is about.
-- reminder_sent:  set by the reminder job (app/api/cron/follow-ups) once it
--                 has emailed staff about this follow-up. Re-armed by trigger
--                 whenever follow_up_at changes, so a rescheduled follow-up
--                 gets its own reminder.
--
-- Visitors may set follow_up_at and follow_up_note on a new enquiry (the
-- "When should we call you?" choice, converted on the server). Only staff
-- can change them afterwards; RLS already limits updates to admins.

alter table public.leads
  add column follow_up_at timestamptz,
  add column follow_up_note text check (char_length(follow_up_note) <= 500),
  add column reminder_sent boolean not null default false;

-- sell_requests.follow_up_at already exists (20261007120000_sell_requests.sql).
alter table public.sell_requests
  add column follow_up_note text check (char_length(follow_up_note) <= 500),
  add column reminder_sent boolean not null default false;

grant insert (follow_up_at, follow_up_note) on public.leads to anon;

-- The old sell_requests insert policy required follow_up_at to be null; the
-- public form still never sets it, but say so for the new columns too.
drop policy "Anyone can send a sell request" on public.sell_requests;
create policy "Anyone can send a sell request"
  on public.sell_requests for insert to anon, authenticated
  with check (
    status = 'new' and notes is null and follow_up_at is null and follow_up_note is null and not reminder_sent
  );

create function public.rearm_follow_up_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.follow_up_at is distinct from old.follow_up_at then
    new.reminder_sent := false;
  end if;
  return new;
end;
$$;

create trigger leads_rearm_follow_up_reminder
  before update of follow_up_at on public.leads
  for each row execute function public.rearm_follow_up_reminder();

create trigger sell_requests_rearm_follow_up_reminder
  before update of follow_up_at on public.sell_requests
  for each row execute function public.rearm_follow_up_reminder();

-- The dashboard widget and the reminder job only look at rows with a follow-up.
create index leads_follow_up_at_idx on public.leads (follow_up_at) where follow_up_at is not null;
create index sell_requests_follow_up_at_idx on public.sell_requests (follow_up_at) where follow_up_at is not null;

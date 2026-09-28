-- Leads management (phase 9).
--
-- 1. lead_notes: internal notes on a lead, one row per note, so staff build
--    up a history ("called, no answer", "test drive Sat 11 AM") instead of
--    overwriting one text box. Author and time are stamped by the database.
--    leads.notes (from the first schema) is copied in and no longer used;
--    it stays because the public insert policy refers to it.
-- 2. admin_lead_car_options(): cars that have leads, with counts, for the
--    "filter by car" menu.

-- ---------------------------------------------------------------------------
-- 1. lead_notes
-- ---------------------------------------------------------------------------

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  author_id uuid references auth.users (id) on delete set null,
  -- Kept as text so the note still says who wrote it after the account is removed.
  author_email text check (char_length(author_email) <= 254),
  created_at timestamptz not null default now()
);

create index lead_notes_lead_id_created_at_idx on public.lead_notes (lead_id, created_at);
create index lead_notes_author_id_idx on public.lead_notes (author_id);

-- Existing notes, copied before the author trigger exists so they keep their time.
insert into public.lead_notes (lead_id, body, created_at)
select id, btrim(notes), updated_at
from public.leads
where nullif(btrim(notes), '') is not null;

-- The author is always the signed-in user, whatever the client sends.
create function public.set_lead_note_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.author_id := (select auth.uid());
  new.author_email := (select auth.jwt() ->> 'email');
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.set_lead_note_author() from public, anon, authenticated;

create trigger lead_notes_set_author
  before insert on public.lead_notes
  for each row execute function public.set_lead_note_author();

alter table public.lead_notes enable row level security;

grant select, insert, delete on public.lead_notes to authenticated;
grant all on public.lead_notes to service_role;

create policy "Admins read lead notes"
  on public.lead_notes for select to authenticated
  using ((select public.is_admin()));

create policy "Admins add lead notes"
  on public.lead_notes for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins delete lead notes"
  on public.lead_notes for delete to authenticated
  using ((select public.is_admin()));

comment on column public.leads.notes is 'Unused since lead_notes; kept because the public insert policy checks it is null.';

-- ---------------------------------------------------------------------------
-- 2. Filter-by-car options
-- ---------------------------------------------------------------------------

-- Security invoker: RLS on leads limits it to admins.
create function public.admin_lead_car_options()
returns table (id uuid, title text, variant text, status public.car_status, lead_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, concat_ws(' ', c.year, b.name, m.name), c.variant, c.status, count(l.id)
  from public.leads l
  join public.cars c on c.id = l.car_id
  join public.brands b on b.id = c.brand_id
  join public.models m on m.id = c.model_id
  group by c.id, b.name, m.name
  order by max(l.created_at) desc
  limit 300;
$$;

revoke execute on function public.admin_lead_car_options() from public, anon;
grant execute on function public.admin_lead_car_options() to authenticated;

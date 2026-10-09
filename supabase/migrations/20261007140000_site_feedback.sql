-- Visitor feedback popup.
--
-- site_settings.feedback_enabled / feedback_delay_seconds: staff switch the
-- popup on or off and choose how long a visitor browses before it appears
-- (/admin/settings).
-- site_feedback: what visitors send. Public (anon) may INSERT only, through
-- a rate-limited server action; only admins can read or delete.

alter table public.site_settings
  add column feedback_enabled boolean not null default true,
  add column feedback_delay_seconds integer not null default 300
    check (feedback_delay_seconds between 60 and 3600);

create table public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  -- Optional Indian 10-digit mobile, stored without +91 or spaces.
  phone text check (phone ~ '^[6-9][0-9]{9}$'),
  -- The page the visitor was on: a path on this site, never a full URL.
  page_url text check (page_url ~ '^/' and char_length(page_url) <= 300),
  created_at timestamptz not null default now()
);

create index site_feedback_created_at_idx on public.site_feedback (created_at desc);
create index site_feedback_rating_idx on public.site_feedback (rating);

alter table public.site_feedback enable row level security;

grant insert (rating, comment, phone, page_url) on public.site_feedback to anon;
grant select, insert, delete on public.site_feedback to authenticated;
grant all on public.site_feedback to service_role;

create policy "Anyone can send feedback"
  on public.site_feedback for insert to anon, authenticated
  with check (true);

create policy "Admins read feedback"
  on public.site_feedback for select to authenticated
  using ((select public.is_admin()));

create policy "Admins delete feedback"
  on public.site_feedback for delete to authenticated
  using ((select public.is_admin()));

-- 1. team_members: "Meet the team" on /about, edited in /admin/content.
-- 2. Optional customer profile on leads (city, budget, body type, timeline,
--    exchange car), asked on the enquiry form to help staff prioritise.

-- ---------------------------------------------------------------------------
-- 1. Team
-- ---------------------------------------------------------------------------

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) <= 80),
  bio text check (char_length(bio) <= 500),
  years_experience smallint check (years_experience between 0 and 80),
  -- Photo in the site-media bucket (team/{uuid}.webp).
  photo_url text check (char_length(photo_url) <= 500),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_sort_order_idx on public.team_members (sort_order, created_at);

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;

grant select on public.team_members to anon;
grant select, insert, update, delete on public.team_members to authenticated;
grant all on public.team_members to service_role;

create policy "Visible team members are public; admins see all"
  on public.team_members for select to anon, authenticated
  using (is_visible or (select public.is_admin()));

create policy "Admins insert team members"
  on public.team_members for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update team members"
  on public.team_members for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete team members"
  on public.team_members for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 2. Customer profile on leads (all optional)
-- ---------------------------------------------------------------------------

alter table public.leads
  add column city text check (char_length(city) <= 60),
  add column budget_range text check (budget_range in ('under_5l', '5_10l', '10_20l', '20l_plus')),
  add column preferred_body_type public.body_type,
  add column buying_timeline text
    check (buying_timeline in ('immediately', 'this_month', '1_3_months', 'browsing')),
  add column has_exchange boolean;

grant insert (city, budget_range, preferred_body_type, buying_timeline, has_exchange) on public.leads to anon;

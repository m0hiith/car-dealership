-- Services shown on /about, edited in /admin/content.
--
-- cta_link: a page on this site ("/cars") or an https link. When it is null
-- the card's button opens WhatsApp with "Hi, I'm interested in your
-- {title} service" pre-filled.
--
-- Seed descriptions are placeholders for the dealer to replace; they make
-- no claims. Finance is seeded hidden: CLAUDE.md §4 bars loan/EMI claims
-- until the dealer confirms them. Sell Your Car opens WhatsApp until a
-- /sell page exists.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  icon text not null default 'car'
    check (icon in ('car', 'tag', 'exchange', 'wrench', 'bag', 'finance', 'shield', 'chat')),
  cta_label text check (cta_label is null or char_length(cta_label) between 1 and 40),
  cta_link text check (
    cta_link is null
    or (char_length(cta_link) <= 300 and (cta_link ~ '^/[^/]' or cta_link = '/' or cta_link like 'https://%'))
  ),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_sort_order_idx on public.services (sort_order, created_at);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;

create policy "Visible services are public; admins see all"
  on public.services for select to anon, authenticated
  using (is_visible or (select public.is_admin()));

create policy "Admins insert services"
  on public.services for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update services"
  on public.services for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete services"
  on public.services for delete to authenticated
  using ((select public.is_admin()));

insert into public.services (title, description, icon, cta_label, cta_link, sort_order, is_visible)
values
  ('Buy Cars', '[Placeholder: describe how customers can buy a car from you.]', 'car', 'Browse cars', '/cars', 0, true),
  ('Sell Your Car', '[Placeholder: describe how customers can sell their car to you.]', 'tag', null, null, 1, true),
  ('Exchange', '[Placeholder: describe how exchanging an old car works with you.]', 'exchange', null, null, 2, true),
  ('Service', '[Placeholder: describe the servicing you offer.]', 'wrench', null, null, 3, true),
  ('Merchandise', '[Placeholder: describe the merchandise or accessories you sell.]', 'bag', null, null, 4, true),
  ('Finance', '[Placeholder: describe the finance help you offer. Confirm the details before showing.]', 'finance', null, null, 5, false),
  ('Insurance', '[Placeholder: describe the insurance help you offer.]', 'shield', null, null, 6, true);

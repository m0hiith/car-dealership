-- Row Level Security (PRODUCT_SPEC §10, CLAUDE.md §5).
--
-- Public (anon) may read public inventory and site content and may only
-- INSERT leads. Everything else requires public.is_admin().
-- auth.uid() and is_admin() are wrapped in (select ...) so Postgres evaluates
-- them once per statement instead of once per row.

-- ---------------------------------------------------------------------------
-- is_admin()
-- ---------------------------------------------------------------------------

-- security definer so it can read admin_users regardless of the caller's RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Trigger functions are never called directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_car_status_timestamps() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
-- Grant explicitly rather than relying on Supabase's default privileges.
-- RLS then decides which rows each role can touch.

revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.brands,
  public.models,
  public.cars,
  public.car_images,
  public.car_features,
  public.testimonials,
  public.homepage_content,
  public.site_settings
to anon;

-- Anon can only supply the enquiry itself; status, notes and timestamps
-- always take their defaults.
grant insert (car_id, name, phone, email, preferred_time, message, source)
  on public.leads to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.cars enable row level security;
alter table public.car_images enable row level security;
alter table public.car_features enable row level security;
alter table public.leads enable row level security;
alter table public.testimonials enable row level security;
alter table public.homepage_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users enable row level security;

-- ---------------------------------------------------------------------------
-- brands / models
-- ---------------------------------------------------------------------------

create policy "Active brands are public; admins see all"
  on public.brands for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins insert brands"
  on public.brands for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update brands"
  on public.brands for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete brands"
  on public.brands for delete to authenticated
  using ((select public.is_admin()));

create policy "Active models are public; admins see all"
  on public.models for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Admins insert models"
  on public.models for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update models"
  on public.models for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete models"
  on public.models for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------

create policy "Published and reserved cars are public; admins see all"
  on public.cars for select to anon, authenticated
  using (status in ('published', 'reserved') or (select public.is_admin()));

create policy "Admins insert cars"
  on public.cars for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update cars"
  on public.cars for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Only drafts may be hard-deleted; published and sold cars are archived.
create policy "Admins delete draft cars only"
  on public.cars for delete to authenticated
  using ((select public.is_admin()) and status = 'draft');

-- ---------------------------------------------------------------------------
-- car_images / car_features (visible when their car is)
-- ---------------------------------------------------------------------------

create policy "Images of public cars are public; admins see all"
  on public.car_images for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.cars c
      where c.id = car_images.car_id and c.status in ('published', 'reserved')
    )
  );

create policy "Admins insert car images"
  on public.car_images for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update car images"
  on public.car_images for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete car images"
  on public.car_images for delete to authenticated
  using ((select public.is_admin()));

create policy "Features of public cars are public; admins see all"
  on public.car_features for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.cars c
      where c.id = car_features.car_id and c.status in ('published', 'reserved')
    )
  );

create policy "Admins insert car features"
  on public.car_features for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update car features"
  on public.car_features for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete car features"
  on public.car_features for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- leads (public insert only)
-- ---------------------------------------------------------------------------
-- There is no public SELECT, so the lead form must insert without
-- .select() / return=representation.

create policy "Anyone can submit a new lead"
  on public.leads for insert to anon, authenticated
  with check (
    status = 'new'
    and notes is null
    and (
      car_id is null
      or exists (
        select 1 from public.cars c
        where c.id = leads.car_id and c.status in ('published', 'reserved')
      )
    )
  );

create policy "Admins insert any lead"
  on public.leads for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins read leads"
  on public.leads for select to authenticated
  using ((select public.is_admin()));

create policy "Admins update leads"
  on public.leads for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete leads"
  on public.leads for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------

create policy "Published testimonials are public; admins see all"
  on public.testimonials for select to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy "Admins insert testimonials"
  on public.testimonials for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update testimonials"
  on public.testimonials for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete testimonials"
  on public.testimonials for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- homepage_content / site_settings (single rows: read by all, updated by admins)
-- ---------------------------------------------------------------------------

create policy "Homepage content is public"
  on public.homepage_content for select to anon, authenticated
  using (true);

create policy "Admins update homepage content"
  on public.homepage_content for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Site settings are public"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "Admins update site settings"
  on public.site_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
-- Read-only through the API. Admins are added or removed in the Supabase SQL
-- editor (see docs/SUPABASE_SETUP.md), so no API user can grant themselves
-- admin.

create policy "Users see their own admin row; admins see all"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Storage buckets (PRODUCT_SPEC §11).
--
-- Both buckets are public, so files are served by URL without a SELECT
-- policy (and anon cannot list them). Only admins can upload, replace,
-- list or delete.
--   car-images: {car_id}/{uuid}.webp, compressed client-side before upload
--   site-media: logo, hero image/video, testimonial photos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'car-images',
    'car-images',
    true,
    10485760, -- 10 MB
    array['image/webp', 'image/jpeg', 'image/png']
  ),
  (
    'site-media',
    'site-media',
    true,
    52428800, -- 50 MB, for short hero videos
    array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins read site files"
  on storage.objects for select to authenticated
  using (bucket_id in ('car-images', 'site-media') and (select public.is_admin()));

create policy "Admins upload site files"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('car-images', 'site-media') and (select public.is_admin()));

create policy "Admins update site files"
  on storage.objects for update to authenticated
  using (bucket_id in ('car-images', 'site-media') and (select public.is_admin()))
  with check (bucket_id in ('car-images', 'site-media') and (select public.is_admin()));

create policy "Admins delete site files"
  on storage.objects for delete to authenticated
  using (bucket_id in ('car-images', 'site-media') and (select public.is_admin()));

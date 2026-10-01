-- Customer video testimonials shown on the homepage.
--
-- A short list of public video URLs (site-media bucket), in display order.
-- homepage_content is already publicly readable and admin-writable, so no
-- policy changes are needed.

alter table public.homepage_content
  add column testimonial_videos text[] not null default '{}'
    check (cardinality(testimonial_videos) <= 6);

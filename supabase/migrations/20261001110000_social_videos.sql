-- Social media videos shown on the homepage between Featured cars and Why
-- Choose Us: public video URLs (site-media bucket), in display order.

alter table public.homepage_content
  add column social_videos text[] not null default '{}'
    check (cardinality(social_videos) <= 8);

-- Review presentation: when a review was written (free text such as
-- "8 months ago") and the overall rating summary shown beside the reviews
-- (for example the Google rating and review count).

alter table public.testimonials
  add column reviewed_when text check (char_length(reviewed_when) <= 60);

alter table public.homepage_content
  add column reviews_rating numeric(2, 1) check (reviews_rating between 1 and 5),
  add column reviews_count integer check (reviews_count >= 0);

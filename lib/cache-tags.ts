/**
 * Cache tags for public queries. Public read functions tag their results with
 * these; admin mutations expire them with updateTag / revalidateTag.
 */
export const CACHE_TAGS = {
  /** Every public list of cars: /cars, brand and type pages, homepage, similar cars. */
  cars: 'cars',
  /** Brand and model lists used by public filters. */
  brands: 'brands',
  /** One car's detail page. */
  car: (slug: string) => `car:${slug}`,
} as const;

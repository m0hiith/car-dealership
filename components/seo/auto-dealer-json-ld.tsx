import type { PublicTestimonial, TestimonialRating } from '@/lib/queries/homepage';
import type { SiteSettings } from '@/lib/queries/settings';
import { jsonLdString, SEO_CITY } from '@/lib/seo';
import { siteUrl } from '@/lib/site-url';

/** Reviews included in the markup; the rating summary still covers every published testimonial. */
const MAX_REVIEWS = 6;

/**
 * schema.org AutoDealer for the homepage and /contact (PRODUCT_SPEC §14).
 * Only fields staff have filled in. AggregateRating and Review come from
 * published testimonials, which are on the page too.
 */
export function AutoDealerJsonLd({
  settings,
  rating,
  reviews = [],
}: {
  settings: SiteSettings;
  rating?: TestimonialRating | null;
  reviews?: PublicTestimonial[];
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: settings.dealershipName,
    url: siteUrl(),
    areaServed: { '@type': 'City', name: SEO_CITY },
  };
  if (settings.logoUrl) {
    data.logo = settings.logoUrl;
    data.image = settings.logoUrl;
  }
  if (settings.phone) data.telephone = settings.phone;
  if (settings.address)
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressLocality: SEO_CITY,
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    };
  if (settings.mapUrl) data.hasMap = settings.mapUrl;
  const sameAs = Object.values(settings.socials);
  if (sameAs.length) data.sameAs = sameAs;
  if (rating && rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.average,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (reviews.length) {
    data.review = reviews.slice(0, MAX_REVIEWS).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.customerName },
      reviewBody: r.review,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    }));
  }

  return (
    <script
      type="application/ld+json"
      // jsonLdString escapes "<", so the content cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}

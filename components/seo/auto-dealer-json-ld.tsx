import type { SiteSettings } from '@/lib/queries/settings';
import { siteUrl } from '@/lib/site-url';

/** schema.org AutoDealer for the homepage and /contact (PRODUCT_SPEC §14). Only fields staff have filled in. */
export function AutoDealerJsonLd({ settings }: { settings: SiteSettings }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: settings.dealershipName,
    url: siteUrl(),
  };
  if (settings.logoUrl) data.logo = settings.logoUrl;
  if (settings.phone) data.telephone = settings.phone;
  if (settings.address)
    data.address = { '@type': 'PostalAddress', streetAddress: settings.address, addressCountry: 'IN' };
  if (settings.mapUrl) data.hasMap = settings.mapUrl;
  const sameAs = Object.values(settings.socials);
  if (sameAs.length) data.sameAs = sameAs;

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

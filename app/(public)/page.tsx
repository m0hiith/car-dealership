import type { Metadata } from 'next';
import { BrowseByBodyType } from '@/components/home/browse-by-body-type';
import { BrowseByBudget } from '@/components/home/browse-by-budget';
import { ContactSection } from '@/components/home/contact-block';
import { DealershipVideo } from '@/components/home/dealership-video';
import { FeaturedCars } from '@/components/home/featured-cars';
import { Hero } from '@/components/home/hero';
import { Testimonials } from '@/components/home/testimonials';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { AutoDealerJsonLd } from '@/components/seo/auto-dealer-json-ld';
import {
  getBrowseOptions,
  getHomepageCars,
  getHomepageContent,
  getPublishedTestimonials,
  HOMEPAGE_TESTIMONIALS_LIMIT,
} from '@/lib/queries/homepage';
import { getSiteSettings } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';

// Rendered once, then served from cache until staff change content, settings,
// testimonials or cars (tag revalidation). The hourly refresh keeps the
// time-based New Arrival badge honest.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [content, settings] = await Promise.all([getHomepageContent(), getSiteSettings()]);
  return {
    title: { absolute: [settings.dealershipName, content.heroTitle].filter(Boolean).join(' | ') },
    description: content.heroDescription ?? undefined,
    alternates: { canonical: '/' },
    openGraph: {
      siteName: settings.dealershipName,
      locale: 'en_IN',
      type: 'website',
      images: content.heroMedia?.type === 'image' ? [{ url: content.heroMedia.url }] : undefined,
    },
  };
}

/** Trust → Inventory → Discovery → Enquiry (PRODUCT_SPEC §5.2). Every word comes from the database. */
export default async function HomePage() {
  const [content, settings, browse, homeCars, testimonials] = await Promise.all([
    getHomepageContent(),
    getSiteSettings(),
    getBrowseOptions(),
    getHomepageCars(),
    getPublishedTestimonials(HOMEPAGE_TESTIMONIALS_LIMIT),
  ]);

  return (
    <>
      <AutoDealerJsonLd settings={settings} />
      <Hero content={content} brands={browse.brands} />
      <BrowseByBodyType counts={browse.bodyTypeCounts} />
      <BrowseByBudget />
      <FeaturedCars cars={homeCars.cars} featured={homeCars.featured} now={getRequestTime()} />
      <WhyChooseUs items={content.whyUs} />
      <DealershipVideo url={content.videoUrl} dealershipName={settings.dealershipName} />
      <Testimonials testimonials={testimonials} />
      <ContactSection settings={settings} />
    </>
  );
}

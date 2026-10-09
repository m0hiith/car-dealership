import type { Metadata } from 'next';
import { BrowseByBodyType } from '@/components/home/browse-by-body-type';
import { BrowseByBudget } from '@/components/home/browse-by-budget';
import { ContactSection } from '@/components/home/contact-block';
import { DealershipVideo } from '@/components/home/dealership-video';
import { FeaturedCars } from '@/components/home/featured-cars';
import { Hero } from '@/components/home/hero';
import { RecentlySold } from '@/components/home/recently-sold';
import { SocialVideos } from '@/components/home/social-videos';
import { Testimonials } from '@/components/home/testimonials';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { AutoDealerJsonLd } from '@/components/seo/auto-dealer-json-ld';
import {
  getBrowseOptions,
  getHomepageCars,
  getHomepageContent,
  getPublishedTestimonials,
  getRecentlySoldCars,
  getSocialLinks,
  getTestimonialRating,
  HOMEPAGE_TESTIMONIALS_LIMIT,
} from '@/lib/queries/homepage';
import { getSiteSettings } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';
import { pageMetadata, SEO_CITY } from '@/lib/seo';

// Rendered once, then served from cache until staff change content, settings,
// testimonials or cars (tag revalidation). The hourly refresh keeps the
// time-based New Arrival badge honest.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [content, settings] = await Promise.all([getHomepageContent(), getSiteSettings()]);
  return pageMetadata({
    title: [settings.dealershipName, `Used Cars in ${SEO_CITY}`].filter(Boolean).join(' | '),
    absoluteTitle: true,
    description:
      content.heroDescription ??
      `Pre-owned cars for sale in ${SEO_CITY}${settings.dealershipName ? ` at ${settings.dealershipName}` : ''}. Browse stock with prices, kilometres and photos, and enquire online.`,
    path: '/',
    siteName: settings.dealershipName,
    image: content.heroMedia?.type === 'image' ? content.heroMedia.url : settings.logoUrl,
  });
}

/** Trust → Inventory → Discovery → Enquiry (PRODUCT_SPEC §5.2). Every word comes from the database. */
export default async function HomePage() {
  const [content, settings, browse, homeCars, soldCars, socialLinks, testimonials, rating] = await Promise.all([
    getHomepageContent(),
    getSiteSettings(),
    getBrowseOptions(),
    getHomepageCars(),
    getRecentlySoldCars(),
    getSocialLinks(),
    getPublishedTestimonials(HOMEPAGE_TESTIMONIALS_LIMIT),
    getTestimonialRating(),
  ]);

  return (
    <>
      <AutoDealerJsonLd settings={settings} rating={rating} reviews={testimonials} />
      <Hero content={content} brands={browse.brands} />
      <BrowseByBodyType counts={browse.bodyTypeCounts} />
      <BrowseByBudget />
      <FeaturedCars cars={homeCars.cars} featured={homeCars.featured} now={getRequestTime()} />
      <RecentlySold cars={soldCars} now={getRequestTime()} />
      <Testimonials
        testimonials={testimonials}
        videos={content.testimonialVideos}
        reviewsUrl={settings.mapUrl}
        summary={content.reviewsSummary}
      />
      <WhyChooseUs items={content.whyUs} />
      <DealershipVideo url={content.videoUrl} dealershipName={settings.dealershipName} />
      <SocialVideos links={socialLinks} urls={content.socialVideos} />
      <ContactSection settings={settings} />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactSection } from '@/components/home/contact-block';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { ServicesSection } from '@/components/services/services-section';
import { TeamSection } from '@/components/team/team-section';
import { buttonStyles } from '@/components/ui';
import { getHomepageContent, getServices, getTeamMembers } from '@/lib/queries/homepage';
import { getSiteSettings } from '@/lib/queries/settings';
import { pageMetadata, SEO_CITY } from '@/lib/seo';

async function aboutTitle() {
  const [content, settings] = await Promise.all([getHomepageContent(), getSiteSettings()]);
  return content.aboutTitle || `About ${settings.dealershipName}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ aboutBody }, settings, title] = await Promise.all([getHomepageContent(), getSiteSettings(), aboutTitle()]);
  return pageMetadata({
    title,
    description: aboutBody
      ? aboutBody.replace(/\s+/g, ' ').slice(0, 160)
      : `About ${settings.dealershipName}, a used car dealership in ${SEO_CITY}: our team, our services and how to reach us.`,
    path: '/about',
    siteName: settings.dealershipName,
    image: settings.logoUrl,
  });
}

/** Copy from /admin/content (About page), then the team, services, Why Choose Us and contact details. */
export default async function AboutPage() {
  const [content, settings, title, services, team] = await Promise.all([
    getHomepageContent(),
    getSiteSettings(),
    aboutTitle(),
    getServices(),
    getTeamMembers(),
  ]);
  const paragraphs =
    content.aboutBody
      ?.split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean) ?? [];

  return (
    <>
      <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-4 pt-8 md:px-6 md:pt-12">
        <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">{title}</h1>
        {paragraphs.length > 0 && (
          <div className="flex max-w-3xl flex-col gap-4 text-body-lg text-chip-ink">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        )}
        <Link href="/cars" className={buttonStyles({ className: 'mt-2 self-start' })}>
          Browse our cars
        </Link>
      </div>
      <TeamSection members={team} />
      <ServicesSection services={services} whatsappNumber={settings.whatsappNumber} />
      <WhyChooseUs items={content.whyUs} />
      <ContactSection settings={settings} />
    </>
  );
}

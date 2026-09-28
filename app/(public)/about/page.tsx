import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactSection } from '@/components/home/contact-block';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { buttonStyles } from '@/components/ui';
import { getHomepageContent } from '@/lib/queries/homepage';
import { getSiteSettings } from '@/lib/queries/settings';

async function aboutTitle() {
  const [content, settings] = await Promise.all([getHomepageContent(), getSiteSettings()]);
  return content.aboutTitle || `About ${settings.dealershipName}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const { aboutBody } = await getHomepageContent();
  return {
    title: await aboutTitle(),
    description: aboutBody ? aboutBody.slice(0, 160) : undefined,
    alternates: { canonical: '/about' },
  };
}

/** Copy from /admin/content (About page), then Why Choose Us and contact details. */
export default async function AboutPage() {
  const [content, settings, title] = await Promise.all([getHomepageContent(), getSiteSettings(), aboutTitle()]);
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
      <WhyChooseUs items={content.whyUs} />
      <ContactSection settings={settings} />
    </>
  );
}

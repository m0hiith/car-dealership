import type { Metadata } from 'next';
import { ContactCard } from '@/components/home/contact-block';
import { LeadForm } from '@/components/leads/lead-form';
import { AutoDealerJsonLd } from '@/components/seo/auto-dealer-json-ld';
import { Card } from '@/components/ui';
import { whatsappHref } from '@/lib/contact';
import { getSiteSettings } from '@/lib/queries/settings';

export async function generateMetadata(): Promise<Metadata> {
  const { dealershipName } = await getSiteSettings();
  return {
    title: 'Contact us',
    description: `Call, WhatsApp or visit ${dealershipName}, or send us a message and we will call you back.`,
    alternates: { canonical: '/contact' },
  };
}

/** Contact details from site_settings and a general enquiry form (not tied to a car). */
export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <AutoDealerJsonLd settings={settings} />
      <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">Contact us</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_28rem]">
        <ContactCard settings={settings} />
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-headline-md text-navy">Send us a message</h2>
            <p className="text-body-md text-muted">Tell us what you are looking for and we will call you back.</p>
          </div>
          <LeadForm
            idPrefix="contact"
            whatsappHref={whatsappHref(settings.whatsappNumber, 'Hi, I just sent an enquiry on your website.')}
          />
        </Card>
      </div>
    </div>
  );
}

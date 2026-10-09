import type { Metadata } from 'next';
import { SellForm } from '@/components/sell/sell-form';
import { getSellBrandOptions } from '@/lib/queries/sell';
import { getSiteSettings } from '@/lib/queries/settings';
import { pageMetadata, SEO_CITY } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return pageMetadata({
    title: `Sell Your Car in ${SEO_CITY}`,
    description: `Tell ${settings.dealershipName || 'us'} about your car in a few short steps and our team will get in touch.`,
    path: '/sell',
    siteName: settings.dealershipName,
    image: settings.logoUrl,
  });
}

/** Public "Sell Your Car" request form. Brands, models and contact numbers come from the database. */
export default async function SellPage() {
  const [brands, settings] = await Promise.all([getSellBrandOptions(), getSiteSettings()]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">Sell your car</h1>
        <p className="text-body-lg text-muted">
          Tell us about your car in five short steps. It takes about two minutes, and our team will contact you.
        </p>
      </header>
      <SellForm brands={brands} whatsappNumber={settings.whatsappNumber} />
    </div>
  );
}

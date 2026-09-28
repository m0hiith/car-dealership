import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSiteSettings } from '@/lib/queries/settings';

export async function generateMetadata(): Promise<Metadata> {
  const { dealershipName, logoUrl } = await getSiteSettings();
  return {
    title: { template: `%s | ${dealershipName}`, default: dealershipName },
    openGraph: {
      siteName: dealershipName,
      locale: 'en_IN',
      type: 'website',
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
  };
}

/** Public showroom chrome. Everything in it comes from site_settings. */
export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="main" className="flex flex-1 flex-col bg-canvas">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

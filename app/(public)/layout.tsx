import type { Metadata } from 'next';
import { FeedbackPrompt } from '@/components/feedback/feedback-prompt';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSiteSettings } from '@/lib/queries/settings';

export async function generateMetadata(): Promise<Metadata> {
  const { dealershipName, logoUrl, googleSiteVerification } = await getSiteSettings();
  return {
    title: { template: `%s | ${dealershipName}`, default: dealershipName },
    openGraph: {
      siteName: dealershipName,
      locale: 'en_IN',
      type: 'website',
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    // Search Console ownership check, pasted in /admin/settings.
    verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
  };
}

/** Public showroom chrome. Everything in it comes from site_settings. */
export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="main" className="surface-dark flex flex-1 flex-col bg-page">
        {children}
      </main>
      <SiteFooter settings={settings} />
      {settings.feedback && <FeedbackPrompt delaySeconds={settings.feedback.delaySeconds} />}
    </>
  );
}

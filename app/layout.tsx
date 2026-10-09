import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

// Brand typeface. latin-ext carries the ₹ sign, so prices render in Montserrat too.
const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

// Site name, description and Open Graph defaults come from site_settings
// (see the (public) layout); this only sets the base every relative
// metadata URL (canonical, OG images) resolves against.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={`${montserrat.variable} h-full`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React hydrates. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

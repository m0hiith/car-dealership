import type { Metadata } from 'next';

// Applies to every /admin route, including the login page.
export const metadata: Metadata = {
  title: { template: '%s · Admin', default: 'Admin' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  return children;
}

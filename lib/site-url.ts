/**
 * Absolute origin of the public site, for links that leave the page (the
 * WhatsApp message) and for metadata. Set NEXT_PUBLIC_SITE_URL in
 * production; on Vercel the production domain is the fallback.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

import Link from 'next/link';
import { telHref, whatsappHref } from '@/lib/contact';
import type { SiteSettings } from '@/lib/queries/settings';
import { PUBLIC_NAV } from './public-nav';

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const call = telHref(settings.phone);
  const whatsapp = whatsappHref(settings.whatsappNumber);

  return (
    <footer className="mt-auto bg-navy-dark text-white/80">
      <div className="mx-auto grid w-full max-w-page gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-headline-sm text-white">{settings.dealershipName}</p>
          {settings.address && <p className="text-body-md whitespace-pre-line">{settings.address}</p>}
          {settings.businessHours && <p className="text-body-md">{settings.businessHours}</p>}
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-col gap-2 text-body-md">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-control focus-ring hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {(call || whatsapp) && (
          <ul className="flex flex-col gap-2 text-body-md">
            {call && settings.phone && (
              <li>
                <a href={call} className="rounded-control focus-ring hover:text-white hover:underline">
                  Call {settings.phone}
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener"
                  className="rounded-control focus-ring hover:text-white hover:underline"
                >
                  WhatsApp us
                </a>
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-page px-4 py-4 text-body-sm text-white/60 md:px-6">
          © {new Date().getFullYear()} {settings.dealershipName}
        </p>
      </div>
    </footer>
  );
}

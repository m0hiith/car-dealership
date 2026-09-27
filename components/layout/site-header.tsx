import Image from 'next/image';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui';
import { telHref, whatsappHref } from '@/lib/contact';
import type { SiteSettings } from '@/lib/queries/settings';
import { MobileNav } from './mobile-nav';
import { PUBLIC_NAV } from './public-nav';

function Brand({ settings }: { settings: SiteSettings }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 rounded-control focus-ring">
      {settings.logoUrl && (
        <Image
          src={settings.logoUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-control bg-white object-contain"
        />
      )}
      <span className="truncate text-headline-sm text-white">{settings.dealershipName}</span>
    </Link>
  );
}

/** Navy header: brand, nav, and Call / WhatsApp when the numbers are set in Settings. */
export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const call = telHref(settings.phone);
  const whatsapp = whatsappHref(settings.whatsappNumber);

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex h-16 w-full max-w-page items-center gap-6 px-4 md:px-6">
        <Brand settings={settings} />
        <nav aria-label="Main" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-control px-3 py-2 text-label-lg text-white/85 focus-ring transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'hidden sm:inline-flex' })}
            >
              WhatsApp
            </a>
          )}
          {call && (
            <a
              href={call}
              className={buttonStyles({
                variant: 'ghost',
                size: 'sm',
                className: 'border-white/40 text-white hover:bg-white/10',
              })}
            >
              Call
            </a>
          )}
          <MobileNav brand={<Brand settings={settings} />} whatsapp={whatsapp} />
        </div>
      </div>
    </header>
  );
}

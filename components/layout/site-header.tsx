import Image from 'next/image';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui';
import { telHref, whatsappHref } from '@/lib/contact';
import type { SiteSettings } from '@/lib/queries/settings';
import { HeaderShell } from './header-shell';
import { MobileNav } from './mobile-nav';
import { PUBLIC_NAV } from './public-nav';

/** The logo in a wide slot (dealer logos are usually wordmarks), then the name in heavy uppercase like the logo. */
function Brand({ settings }: { settings: SiteSettings }) {
  return (
    <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3 rounded-control focus-ring">
      {settings.logoUrl && (
        // Fixed height, natural width: a square logo sits snug next to the name, a wide one gets its width.
        <Image
          src={settings.logoUrl}
          alt=""
          width={176}
          height={64}
          sizes="176px"
          className="h-11 w-auto max-w-32 shrink-0 object-contain md:h-14 md:max-w-44"
        />
      )}
      <span className="truncate text-body-lg font-extrabold tracking-wide text-navy uppercase md:text-headline-sm">
        {settings.dealershipName}
      </span>
    </Link>
  );
}

/** White header: brand, nav, and Call / WhatsApp when the numbers are set in Settings. */
export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const call = telHref(settings.phone);
  const whatsapp = whatsappHref(settings.whatsappNumber);

  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 w-full max-w-page items-center gap-6 px-4 md:h-20 md:px-6">
        <Brand settings={settings} />
        <nav aria-label="Main" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative rounded-control px-3 py-2 text-label-lg font-extrabold text-navy focus-ring transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-action after:transition-transform hover:text-navy hover:after:scale-x-100"
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
              className={buttonStyles({ variant: 'whatsapp', size: 'sm', className: 'hidden sm:inline-flex' })}
            >
              WhatsApp
            </a>
          )}
          {call && (
            <a href={call} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              Call
            </a>
          )}
          <MobileNav brand={<Brand settings={settings} />} whatsapp={whatsapp} />
        </div>
      </div>
    </HeaderShell>
  );
}

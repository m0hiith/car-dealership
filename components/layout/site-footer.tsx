import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/ui/icons';
import { telHref, whatsappHref } from '@/lib/contact';
import type { SiteSettings } from '@/lib/queries/settings';
import { SOCIAL_NETWORKS, type SocialNetwork } from '@/lib/validation/content';
import { PUBLIC_NAV } from './public-nav';

const SOCIAL_ICONS: Record<SocialNetwork, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
};

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const call = telHref(settings.phone);
  const whatsapp = whatsappHref(settings.whatsappNumber);
  const socials = (Object.keys(SOCIAL_NETWORKS) as SocialNetwork[]).flatMap((network) => {
    const url = settings.socials[network];
    return url ? [{ network, url }] : [];
  });

  return (
    <footer className="mt-auto bg-navy-dark text-white/80">
      <div className="mx-auto grid w-full max-w-page gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-headline-sm text-white">{settings.dealershipName}</p>
          {settings.address && <p className="text-body-md whitespace-pre-line">{settings.address}</p>}
          {settings.businessHours && <p className="text-body-md whitespace-pre-line">{settings.businessHours}</p>}
          {settings.mapUrl && (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener"
              className="self-start rounded-control text-body-md focus-ring hover:text-white hover:underline"
            >
              Get directions
            </a>
          )}
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
        {(call || whatsapp || socials.length > 0) && (
          <div className="flex flex-col gap-4">
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
            {socials.length > 0 && (
              <ul className="flex gap-2">
                {socials.map(({ network, url }) => {
                  const Icon = SOCIAL_ICONS[network];
                  return (
                    <li key={network}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener"
                        aria-label={SOCIAL_NETWORKS[network]}
                        className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 focus-ring transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Icon width={18} height={18} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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

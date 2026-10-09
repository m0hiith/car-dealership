import type { ReactNode } from 'react';
import { buttonStyles, Card } from '@/components/ui';
import { ClockIcon, ExternalLinkIcon, MapPinIcon, PhoneIcon, QuoteIcon } from '@/components/ui/icons';
import { mapEmbedUrl, telHref, whatsappHref } from '@/lib/contact';
import type { SiteSettings } from '@/lib/queries/settings';
import { HomeSection } from './section';

export function hasContactDetails(s: SiteSettings) {
  return Boolean(telHref(s.phone) || whatsappHref(s.whatsappNumber) || s.address || s.businessHours || s.mapUrl);
}

/** Homepage band around the contact card. */
export function ContactSection({ settings }: { settings: SiteSettings }) {
  if (!hasContactDetails(settings)) return null;
  return (
    <HomeSection id="contact" title="Visit or get in touch" tone="plain">
      <ContactCard settings={settings} />
    </HomeSection>
  );
}

/** Address, hours, map link, Call and WhatsApp from site_settings. Nothing until any of them is set. */
export function ContactCard({ settings }: { settings: SiteSettings }) {
  const call = telHref(settings.phone);
  const whatsapp = whatsappHref(settings.whatsappNumber, 'Hi, I would like to know more about your cars.');
  const { address, businessHours: hours, mapUrl } = settings;
  if (!hasContactDetails(settings)) return null;
  const embed = mapEmbedUrl(mapUrl);
  const hasDetails = Boolean(address || hours || (call && settings.phone));

  return (
    <div className="flex flex-col gap-4">
      <Card
        padding="lg"
        className={
          hasDetails
            ? 'grid gap-6 md:grid-cols-[1fr_auto] md:items-center'
            : 'flex flex-col gap-3 sm:flex-row sm:flex-wrap'
        }
      >
        {hasDetails && (
          <dl className="flex flex-col gap-4">
            {address && (
              <Detail icon={<MapPinIcon width={20} height={20} />} label="Address">
                <span className="whitespace-pre-line">{address}</span>
              </Detail>
            )}
            {hours && (
              <Detail icon={<ClockIcon width={20} height={20} />} label="Hours">
                <span className="whitespace-pre-line">{hours}</span>
              </Detail>
            )}
            {call && settings.phone && (
              <Detail icon={<PhoneIcon width={20} height={20} />} label="Phone">
                <a href={call} className="rounded-control font-semibold text-navy focus-ring hover:text-action-ink">
                  {settings.phone}
                </a>
              </Detail>
            )}
          </dl>
        )}
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener" className={buttonStyles({ variant: 'whatsapp' })}>
              <QuoteIcon width={18} height={18} />
              WhatsApp us
            </a>
          )}
          {call && (
            <a href={call} className={buttonStyles()}>
              <PhoneIcon width={18} height={18} />
              Call now
            </a>
          )}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener" className={buttonStyles({ variant: 'ghost' })}>
              <ExternalLinkIcon width={18} height={18} />
              Open in Maps
            </a>
          )}
        </div>
      </Card>
      {embed && (
        <div className="h-72 w-full overflow-hidden rounded-card border border-border bg-chip shadow-card sm:h-80 md:h-96">
          <iframe
            src={embed}
            title={`Map showing ${settings.dealershipName || 'our showroom'}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full"
          />
        </div>
      )}
    </div>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5 text-action-ink">
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <dt className="text-label-md text-muted uppercase">{label}</dt>
        <dd className="text-body-lg text-chip-ink">{children}</dd>
      </div>
    </div>
  );
}

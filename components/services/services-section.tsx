import Link from 'next/link';
import { HomeSection } from '@/components/home/section';
import { buttonStyles } from '@/components/ui';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappHref } from '@/lib/contact';
import type { PublicService } from '@/lib/queries/homepage';
import { ServiceIcon } from './service-icon';

/** The button for one service: its own link if staff set one, else WhatsApp with the service name pre-filled. */
function ServiceCta({ service, whatsappNumber }: { service: PublicService; whatsappNumber: string | null }) {
  const className = buttonStyles({ variant: 'ghost', size: 'sm', className: 'self-start' });

  if (service.ctaLink) {
    const label = service.ctaLabel ?? 'Learn more';
    return service.ctaLink.startsWith('/') ? (
      <Link href={service.ctaLink} className={className}>
        {label}
      </Link>
    ) : (
      <a href={service.ctaLink} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  const whatsapp = whatsappHref(whatsappNumber, `Hi, I'm interested in your ${service.title} service`);
  if (!whatsapp) {
    return (
      <Link href="/contact" className={className}>
        Contact us
      </Link>
    );
  }
  return (
    <a
      href={whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Enquire about ${service.title} on WhatsApp`}
      className={buttonStyles({ variant: 'whatsapp', size: 'sm', className: 'self-start' })}
    >
      <WhatsAppIcon width={16} height={16} />
      Enquire on WhatsApp
    </a>
  );
}

/** "Our services" cards from /services (edited in /admin/content). Hidden when there are none. */
export function ServicesSection({
  services,
  whatsappNumber,
}: {
  services: PublicService[];
  whatsappNumber: string | null;
}) {
  if (services.length === 0) return null;
  return (
    <HomeSection id="services" title="Our services" tone="plain">
      <ul className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {services.map((service) => (
          <li
            key={service.id}
            className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card transition-[box-shadow,border-color] hover:border-tint hover:shadow-card-hover md:p-6"
          >
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full bg-action-soft text-action-ink"
            >
              <ServiceIcon icon={service.icon} width={22} height={22} />
            </span>
            <h3 className="text-headline-sm text-navy">{service.title}</h3>
            {service.description && <p className="flex-1 text-body-md text-muted">{service.description}</p>}
            <div className="mt-auto pt-1">
              <ServiceCta service={service} whatsappNumber={whatsappNumber} />
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

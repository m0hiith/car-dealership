import Image from 'next/image';
import type { ComponentType, SVGProps } from 'react';
import { ExternalLinkIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, YoutubeIcon } from '@/components/ui/icons';
import type { PublicSocialLink } from '@/lib/queries/homepage';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@/lib/validation/content';

const ICONS: Record<SocialPlatform, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  whatsapp: WhatsAppIcon,
  other: ExternalLinkIcon,
};

/** Each group of items must be wider than the screen for the loop to look endless. */
const MIN_ITEMS_PER_GROUP = 8;

function SocialItem({ link, hidden }: { link: PublicSocialLink; hidden: boolean }) {
  const Icon = ICONS[link.platform];
  const platform = SOCIAL_PLATFORMS[link.platform];
  const common = {
    href: link.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    // Repeats exist only to fill the loop: keep them out of the tab order and away from screen readers.
    tabIndex: hidden ? -1 : undefined,
    'aria-hidden': hidden || undefined,
  } as const;

  if (link.thumbnailUrl) {
    return (
      <a
        {...common}
        aria-label={hidden ? undefined : `${link.label} on ${platform} (opens in a new tab)`}
        className="group relative block aspect-4/5 w-40 shrink-0 overflow-hidden rounded-card border border-border bg-brand shadow-card focus-ring md:w-48"
      >
        <Image
          src={link.thumbnailUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 192px, 160px"
          className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-brand/90 to-transparent px-3 pt-8 pb-3 text-white"
        >
          <Icon width={18} height={18} className="shrink-0" />
          <span className="truncate text-label-lg">{link.label}</span>
        </span>
      </a>
    );
  }

  return (
    <a
      {...common}
      aria-label={hidden ? undefined : `${link.label} on ${platform} (opens in a new tab)`}
      className="group flex h-16 w-64 shrink-0 items-center gap-3 rounded-card border border-border bg-card px-4 shadow-card focus-ring transition-[box-shadow,border-color] hover:border-tint hover:shadow-card-hover"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action-ink"
      >
        <Icon width={20} height={20} />
      </span>
      <span aria-hidden className="flex min-w-0 flex-col">
        <span className="truncate text-label-lg text-navy">{link.label}</span>
        <span className="text-body-sm text-muted">{platform}</span>
      </span>
      <ExternalLinkIcon aria-hidden width={16} height={16} className="ml-auto shrink-0 text-muted" />
    </a>
  );
}

/**
 * Endless horizontal banner of social links, in pure CSS (see .marquee in
 * globals.css): it pauses while hovered, touched or focused, and with
 * reduced motion it becomes an ordinary swipeable strip.
 */
export function SocialMarquee({ links }: { links: PublicSocialLink[] }) {
  if (links.length === 0) return null;
  const repeats = Math.ceil(MIN_ITEMS_PER_GROUP / links.length);
  const group = Array.from({ length: repeats }, (_, rep) => links.map((link) => ({ link, rep }))).flat();

  return (
    <div
      className="marquee -mx-4 md:mx-0"
      style={{ ['--marquee-duration' as string]: `${Math.max(group.length * 5, 30)}s` }}
    >
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className="marquee-group"
            aria-hidden={copy === 1 ? true : undefined}
            aria-label="Our social media"
          >
            {group.map(({ link, rep }) => (
              <li key={`${link.id}-${rep}`} className={rep > 0 ? 'marquee-repeat' : undefined}>
                <SocialItem link={link} hidden={copy === 1 || rep > 0} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

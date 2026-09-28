import Image from 'next/image';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui';
import type { BrowseOptions, HomepageContent } from '@/lib/queries/homepage';
import { HeroSearch } from './hero-search';

/** Headline, description, CTA and optional image or video from homepage_content, plus the search box. */
export function Hero({ content, brands }: { content: HomepageContent; brands: BrowseOptions['brands'] }) {
  const { heroMedia: media, cta } = content;
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-navy text-white">
      {media?.type === 'image' && (
        <Image src={media.url} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      )}
      {media?.type === 'video' && (
        <video
          src={media.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
        />
      )}
      {/* Keeps white text readable on any photo. */}
      {media && (
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-navy-dark/90 via-navy/75 to-navy/40" />
      )}

      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 pt-10 pb-8 md:px-6 md:pt-20 md:pb-12">
        <div className="flex max-w-2xl flex-col items-start gap-4">
          <h1 id="hero-heading" className="text-headline-xl-mobile md:text-headline-xl">
            {content.heroTitle}
          </h1>
          {content.heroDescription && <p className="text-body-lg text-white/85">{content.heroDescription}</p>}
          {cta && (
            <Link href={cta.href} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
              {cta.text}
            </Link>
          )}
        </div>
        <div className="max-w-4xl text-chip-ink">
          <HeroSearch brands={brands} />
        </div>
      </div>
    </section>
  );
}

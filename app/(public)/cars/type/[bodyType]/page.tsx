import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CarsListing } from '@/components/cars/cars-listing';
import { BODY_TYPE_LABELS, BODY_TYPES, type BodyType } from '@/lib/car-options';
import { getSiteSettings } from '@/lib/queries/settings';
import { landingPath, pageMetadata, SEO_CITY } from '@/lib/seo';
import { parseListingState } from '@/lib/validation/public-cars';

async function loadBodyType(params: Promise<{ bodyType: string }>): Promise<BodyType> {
  const { bodyType } = await params;
  const match = BODY_TYPES.find((t) => t === bodyType);
  if (!match) notFound();
  return match;
}

/** "SUVs", "Sedans", "Luxury cars". */
function plural(type: BodyType) {
  return type === 'luxury' ? 'luxury cars' : `${BODY_TYPE_LABELS[type]}s`;
}

export async function generateMetadata({ params }: PageProps<'/cars/type/[bodyType]'>): Promise<Metadata> {
  const [type, settings] = await Promise.all([loadBodyType(params), getSiteSettings()]);
  return pageMetadata({
    title: `Used ${plural(type)} for Sale in ${SEO_CITY}`,
    description: `Browse pre-owned ${plural(type)} in stock in ${SEO_CITY}, with prices, photos and full details.`,
    // The filterable listing and /used-cars/<type> show the same stock; the landing page is the one to rank.
    path: landingPath({ kind: 'body', bodyType: type }),
    siteName: settings.dealershipName,
    image: settings.logoUrl,
  });
}

export default async function BodyTypeCarsPage({ params, searchParams }: PageProps<'/cars/type/[bodyType]'>) {
  const [type, raw] = await Promise.all([loadBodyType(params), searchParams]);
  return (
    <CarsListing
      basePath={`/cars/type/${type}`}
      state={parseListingState(raw)}
      fixed={{ bodyTypes: [type] }}
      fixedLabel={BODY_TYPE_LABELS[type]}
      title={`Used ${plural(type)}`}
    />
  );
}

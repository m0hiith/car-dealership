import { BODY_TYPE_LABELS, FUEL_LABELS, isAutomatic } from '@/lib/car-options';
import type { PublicCarDetail } from '@/lib/queries/car-detail';
import { jsonLdString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';

/** schema.org Car with an Offer for a car detail page (PRODUCT_SPEC §14). */
export function CarJsonLd({ car }: { car: PublicCarDetail }) {
  const url = absoluteUrl(`/cars/${car.slug}`);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: [car.title, car.variant].filter(Boolean).join(' '),
    url,
    vehicleModelDate: String(car.year),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.kmsDriven, unitCode: 'KMT' },
    fuelType: FUEL_LABELS[car.fuelType],
    vehicleTransmission: isAutomatic(car.transmission) ? 'Automatic' : 'Manual',
    itemCondition: 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      price: car.price,
      priceCurrency: 'INR',
      availability: car.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
  };
  if (car.brand) data.brand = { '@type': 'Brand', name: car.brand.name };
  if (car.model) data.model = car.model;
  if (car.colour) data.color = car.colour;
  if (car.engineCc) data.vehicleEngine = { '@type': 'EngineSpecification', engineDisplacement: `${car.engineCc} cc` };
  if (car.photos.length) data.image = car.photos.map((p) => p.url);
  if (car.description) data.description = car.description.slice(0, 500);
  data.bodyType = BODY_TYPE_LABELS[car.bodyType];
  data.numberOfPreviousOwners = car.owners;

  return (
    <script
      type="application/ld+json"
      // jsonLdString escapes "<", so the content cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}

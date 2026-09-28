import { FUEL_LABELS, isAutomatic } from '@/lib/car-options';
import type { PublicCarDetail } from '@/lib/queries/car-detail';
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
      availability:
        car.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
  };
  if (car.brand) data.brand = { '@type': 'Brand', name: car.brand.name };
  if (car.model) data.model = car.model;
  if (car.colour) data.color = car.colour;
  if (car.engineCc) data.vehicleEngine = { '@type': 'EngineSpecification', engineDisplacement: `${car.engineCc} cc` };
  if (car.photos.length) data.image = car.photos.map((p) => p.url);

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

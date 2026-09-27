import { formatPriceFull } from './format';

/** Pre-filled text for WhatsApp links and the enquiry form on a car's page. */

type Car = { title: string; variant: string | null; price: number; status: 'published' | 'reserved' };

function carName(car: Car) {
  return [car.title, car.variant].filter(Boolean).join(' ');
}

export function carWhatsappMessage(car: Car, url: string): string {
  const name = `${carName(car)} (${formatPriceFull(car.price)})`;
  return car.status === 'reserved'
    ? `Hi, I saw the ${name} is reserved. Do you have anything similar? ${url}`
    : `Hi, I'm interested in the ${name}. Is it still available? ${url}`;
}

export function carFollowUpMessage(car: Car, url: string): string {
  return `Hi, I just sent an enquiry about the ${carName(car)} (${formatPriceFull(car.price)}). ${url}`;
}

export function carEnquiryMessage(car: Car): string {
  return car.status === 'reserved'
    ? `I saw the ${carName(car)} is reserved. Do you have anything similar?`
    : `I'm interested in the ${carName(car)}. Is it still available?`;
}

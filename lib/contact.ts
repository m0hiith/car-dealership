/** Contact links built from site_settings numbers, which staff may type with spaces, dashes or +91. */

function indianDigits(number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/** wa.me link with an optional pre-filled message, or null if the number is unusable. */
export function whatsappHref(number: string | null | undefined, message?: string): string | null {
  const digits = number ? indianDigits(number) : null;
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function telHref(number: string | null | undefined): string | null {
  const digits = number ? indianDigits(number) : null;
  return digits ? `tel:+${digits}` : null;
}

/** Coordinates inside a full Google Maps place link ("!3d17.45!4d78.39", else "@17.45,78.39"). */
function mapCoordinates(mapUrl: string): { lat: string; lng: string } | null {
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(mapUrl);
  if (pin) return { lat: pin[1]!, lng: pin[2]! };
  const view = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(mapUrl);
  return view ? { lat: view[1]!, lng: view[2]! } : null;
}

/**
 * Keyless Google Maps embed for the pin in a full place link, or null for
 * links without coordinates (e.g. a maps.app.goo.gl short link).
 */
export function mapEmbedUrl(mapUrl: string | null | undefined): string | null {
  const coords = mapUrl ? mapCoordinates(mapUrl) : null;
  return coords ? `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed` : null;
}

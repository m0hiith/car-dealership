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

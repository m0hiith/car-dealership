import { describe, expect, it } from 'vitest';
import { mapEmbedUrl } from '@/lib/contact';

describe('mapEmbedUrl', () => {
  it('uses the pin coordinates of a full place link', () => {
    const url =
      'https://www.google.com/maps/place/Value+car+mart/@17.4504057,78.3970057,592m/data=!3m1!1e3!4m6!3m5!1s0x1:0x2!8m2!3d17.4505431!4d78.3963758';
    expect(mapEmbedUrl(url)).toBe('https://maps.google.com/maps?q=17.4505431,78.3963758&z=16&output=embed');
  });

  it('falls back to the view centre', () => {
    expect(mapEmbedUrl('https://www.google.com/maps/@17.45,78.39,15z')).toBe(
      'https://maps.google.com/maps?q=17.45,78.39&z=16&output=embed',
    );
  });

  it('returns null for short links and empty values', () => {
    expect(mapEmbedUrl('https://maps.app.goo.gl/abc')).toBeNull();
    expect(mapEmbedUrl(null)).toBeNull();
  });
});

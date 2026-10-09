import { beforeAll, describe, expect, it } from 'vitest';
import { budgetHref, BUDGET_BANDS, searchHref } from '@/lib/browse-links';
import { isSiteMediaPath, siteMediaPathFromUrl, siteMediaUrl } from '@/lib/site-media';
import {
  fieldErrors,
  homepageContentSchema,
  parseSiteVerification,
  parseSocials,
  parseWhyUs,
  serviceSchema,
  siteSettingsSchema,
  socialLinkSchema,
  testimonialSchema,
} from '@/lib/validation/content';
import { parseVideoUrl } from '@/lib/video';

const UUID = '3f2b6c1e-8a4d-4f7b-9c2e-1d5a6b7c8d9e';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

describe('parseVideoUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('reads the YouTube id from %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ kind: 'youtube', id });
  });

  it('accepts direct video files', () => {
    expect(parseVideoUrl('https://cdn.example.com/tour.mp4')).toEqual({
      kind: 'file',
      url: 'https://cdn.example.com/tour.mp4',
    });
  });

  it.each([
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/abc',
    'https://example.com/page',
    'javascript:alert(1)',
    'not a url',
    '',
    null,
  ])('rejects %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe('site-media paths', () => {
  it('accepts server-generated paths for the right kind and extension', () => {
    expect(isSiteMediaPath(`hero/${UUID}.webp`)).toBe(true);
    expect(isSiteMediaPath(`hero/${UUID}.mp4`, 'hero')).toBe(true);
    expect(isSiteMediaPath(`logo/${UUID}.webp`, 'logo')).toBe(true);
    expect(isSiteMediaPath(`testimonials/${UUID}.webp`, 'testimonials')).toBe(true);
  });

  it('rejects other kinds, extensions and traversal', () => {
    expect(isSiteMediaPath(`logo/${UUID}.webp`, 'hero')).toBe(false);
    expect(isSiteMediaPath(`logo/${UUID}.mp4`)).toBe(false);
    expect(isSiteMediaPath(`hero/${UUID}.jpg`)).toBe(false);
    expect(isSiteMediaPath(`../hero/${UUID}.webp`)).toBe(false);
    expect(isSiteMediaPath('logo.jpg')).toBe(false);
  });

  it('round-trips a URL this app built, and ignores anything else', () => {
    const path = `logo/${UUID}.webp`;
    expect(siteMediaPathFromUrl(siteMediaUrl(path))).toBe(path);
    expect(siteMediaPathFromUrl('https://example.supabase.co/storage/v1/object/public/site-media/logo.jpg')).toBeNull();
    expect(siteMediaPathFromUrl(`https://other.example.com/${path}`)).toBeNull();
    expect(siteMediaPathFromUrl(null)).toBeNull();
  });
});

describe('homepageContentSchema', () => {
  const base = {
    heroTitle: ' Quality cars ',
    heroDescription: '',
    heroMedia: 'keep',
    ctaText: 'Browse cars',
    ctaLink: '/cars',
    whyUs: [{ title: 'Transparent pricing', description: '' }],
    videoUrl: '',
    aboutTitle: '',
    aboutBody: '',
  } as const;

  it('trims text and turns empty optional fields into null', () => {
    const parsed = homepageContentSchema.parse(base);
    expect(parsed.heroTitle).toBe('Quality cars');
    expect(parsed.heroDescription).toBeNull();
    expect(parsed.videoUrl).toBeNull();
  });

  it('needs button text and link together', () => {
    const result = homepageContentSchema.safeParse({ ...base, ctaLink: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty('ctaLink');
    expect(homepageContentSchema.safeParse({ ...base, ctaText: '', ctaLink: '' }).success).toBe(true);
  });

  it.each(['/cars?fuel=diesel', '/contact', 'https://example.com/offer'])('accepts the link %s', (ctaLink) => {
    expect(homepageContentSchema.safeParse({ ...base, ctaLink }).success).toBe(true);
  });

  it.each(['//evil.example', 'javascript:alert(1)', 'http://example.com', 'cars'])('rejects the link %s', (ctaLink) => {
    expect(homepageContentSchema.safeParse({ ...base, ctaLink }).success).toBe(false);
  });

  it('reports why-us errors by item', () => {
    const result = homepageContentSchema.safeParse({
      ...base,
      whyUs: [...base.whyUs, { title: ' ', description: '' }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty(['whyUs.1.title']);
  });

  it('only accepts uploads to the hero folder', () => {
    expect(homepageContentSchema.safeParse({ ...base, heroMedia: { path: `hero/${UUID}.mp4` } }).success).toBe(true);
    expect(homepageContentSchema.safeParse({ ...base, heroMedia: { path: `logo/${UUID}.webp` } }).success).toBe(false);
  });

  it('rejects unsupported video links', () => {
    expect(homepageContentSchema.safeParse({ ...base, videoUrl: 'https://vimeo.com/123' }).success).toBe(false);
  });
});

describe('siteSettingsSchema', () => {
  const base = {
    dealershipName: 'Test Motors',
    logo: 'keep',
    phone: '040 1234 5678',
    whatsappNumber: '+91 98765 43210',
    address: '',
    mapUrl: 'https://maps.app.goo.gl/abc',
    businessHours: '',
    socials: { instagram: '', facebook: 'https://facebook.com/test', youtube: '' },
    feedbackEnabled: true,
    feedbackDelayMinutes: '5',
    googleSiteVerification: '',
  } as const;

  it('accepts a landline phone and a mobile WhatsApp number', () => {
    const parsed = siteSettingsSchema.parse(base);
    expect(parsed.phone).toBe('040 1234 5678');
    expect(parsed.socials).toEqual({ instagram: null, facebook: 'https://facebook.com/test', youtube: null });
  });

  it('stores the feedback popup delay in minutes, from 1 to 60', () => {
    expect(siteSettingsSchema.parse(base).feedbackDelayMinutes).toBe(5);
    expect(siteSettingsSchema.safeParse({ ...base, feedbackDelayMinutes: '0' }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ ...base, feedbackDelayMinutes: '61' }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ ...base, feedbackDelayMinutes: 'five' }).success).toBe(false);
  });

  it('rejects a WhatsApp number that is not a mobile', () => {
    expect(siteSettingsSchema.safeParse({ ...base, whatsappNumber: '040 1234 5678' }).success).toBe(false);
  });

  it('rejects non-https links', () => {
    expect(siteSettingsSchema.safeParse({ ...base, mapUrl: 'http://maps.google.com' }).success).toBe(false);
    expect(
      siteSettingsSchema.safeParse({ ...base, socials: { ...base.socials, instagram: 'javascript:alert(1)' } }).success,
    ).toBe(false);
  });
});

describe('testimonialSchema', () => {
  it('limits the rating to 1-5', () => {
    const base = { customerName: 'Ravi', review: 'Smooth purchase.', rating: 5, isPublished: true, photo: 'keep' };
    expect(testimonialSchema.safeParse(base).success).toBe(true);
    expect(testimonialSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(testimonialSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
  });
});

describe('stored JSON parsing', () => {
  it('skips malformed why-us rows', () => {
    expect(parseWhyUs([{ title: 'Quality cars', description: 'x' }, { nope: 1 }, 'x'])).toEqual([
      { title: 'Quality cars', description: 'x' },
    ]);
    expect(parseWhyUs(null)).toEqual([]);
  });

  it('keeps only known networks with https links', () => {
    expect(
      parseSocials({ instagram: 'https://instagram.com/x', tiktok: 'https://t.co', facebook: 'http://fb.com' }),
    ).toEqual({ instagram: 'https://instagram.com/x' });
  });
});

describe('browse links', () => {
  it('builds budget links in lakh', () => {
    expect(BUDGET_BANDS.map(budgetHref)).toEqual([
      '/cars?max_price=5',
      '/cars?min_price=5&max_price=10',
      '/cars?min_price=10&max_price=20',
      '/cars?min_price=20',
    ]);
  });

  it('builds search links', () => {
    expect(searchHref({})).toBe('/cars');
    expect(searchHref({ brand: 'hyundai' })).toBe('/cars?brand=hyundai');
    expect(searchHref({ brand: 'hyundai', model: 'creta' })).toBe('/cars?brand=hyundai&model=creta');
  });
});

describe('socialLinkSchema', () => {
  const base = {
    platform: 'instagram',
    label: 'Our Instagram',
    url: 'https://www.instagram.com/dealer',
    thumbnail: 'keep',
    isActive: true,
  } as const;

  it('accepts a link on its own platform', () => {
    expect(socialLinkSchema.safeParse(base).success).toBe(true);
    expect(socialLinkSchema.safeParse({ ...base, platform: 'youtube', url: 'https://youtu.be/abc' }).success).toBe(
      true,
    );
    expect(
      socialLinkSchema.safeParse({ ...base, platform: 'whatsapp', url: 'https://wa.me/919876543210' }).success,
    ).toBe(true);
  });

  it.each([
    ['a link on the wrong platform', { url: 'https://www.facebook.com/dealer' }],
    ['a look-alike host', { url: 'https://instagram.com.evil.example/x' }],
    ['plain http', { url: 'http://www.instagram.com/dealer' }],
    ['a javascript: link', { url: 'javascript:alert(1)' }],
    ['a missing name', { label: '  ' }],
  ])('rejects %s', (_name, change) => {
    expect(socialLinkSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });

  it('accepts any https link for "other"', () => {
    expect(socialLinkSchema.safeParse({ ...base, platform: 'other', url: 'https://example.com/page' }).success).toBe(
      true,
    );
    expect(socialLinkSchema.safeParse({ ...base, platform: 'other', url: 'http://example.com' }).success).toBe(false);
  });
});

describe('serviceSchema', () => {
  const base = {
    title: 'Exchange',
    description: 'Bring your old car.',
    icon: 'exchange',
    ctaLabel: '',
    ctaLink: '',
    isVisible: true,
  } as const;

  it('accepts a WhatsApp service (no link) and turns empty fields into null', () => {
    const parsed = serviceSchema.parse(base);
    expect(parsed.ctaLink).toBeNull();
    expect(parsed.ctaLabel).toBeNull();
  });

  it.each([['/cars'], ['/sell'], ['https://example.com/finance']])('accepts the link %s', (ctaLink) => {
    expect(serviceSchema.safeParse({ ...base, ctaLink }).success).toBe(true);
  });

  it.each([
    ['a protocol-relative link', { ctaLink: '//evil.example' }],
    ['a javascript: link', { ctaLink: 'javascript:alert(1)' }],
    ['button text without a link', { ctaLabel: 'Learn more' }],
    ['an unknown icon', { icon: 'rocket' }],
    ['an empty title', { title: ' ' }],
  ])('rejects %s', (_name, change) => {
    expect(serviceSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });
});

describe('parseSiteVerification', () => {
  it.each([
    ['<meta name="google-site-verification" content="AbC_123-xyz987" />', 'AbC_123-xyz987'],
    ["<meta name='google-site-verification' content='AbC_123-xyz987'>", 'AbC_123-xyz987'],
    ['  AbC_123-xyz987  ', 'AbC_123-xyz987'],
    ['', null],
  ])('%s → %s', (input, expected) => {
    expect(parseSiteVerification(input)).toBe(expected);
  });

  it.each(['short', '<script>alert(1)</script>', 'content="has spaces in it"'])('rejects %s', (input) => {
    expect(parseSiteVerification(input)).toBeUndefined();
  });
});

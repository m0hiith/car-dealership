import { getSupabasePublicEnv } from '@/lib/supabase/env';

/**
 * Files in the public site-media bucket: the logo, the hero image or video
 * and testimonial photos. The server picks every path, {kind}/{uuid}.{ext},
 * so a path is enough to rebuild the public URL and to know the file is ours
 * to delete.
 */

export const SITE_MEDIA_BUCKET = 'site-media';

export const SITE_MEDIA_KINDS = {
  hero: ['webp', 'mp4', 'webm'],
  logo: ['webp'],
  testimonials: ['webp'],
  social: ['webp'],
  team: ['webp'],
} as const satisfies Record<string, readonly string[]>;

export type SiteMediaKind = keyof typeof SITE_MEDIA_KINDS;
export type SiteMediaExt = (typeof SITE_MEDIA_KINDS)[SiteMediaKind][number];

const PATH =
  /^(hero|logo|testimonials|social|team)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|mp4|webm)$/;

export function isSiteMediaPath(path: string, kind?: SiteMediaKind): boolean {
  const match = PATH.exec(path);
  if (!match) return false;
  const [, pathKind, ext] = match as unknown as [string, SiteMediaKind, string];
  if (kind && pathKind !== kind) return false;
  return (SITE_MEDIA_KINDS[pathKind] as readonly string[]).includes(ext);
}

function publicPrefix() {
  return `${getSupabasePublicEnv().url}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/`;
}

export function siteMediaUrl(path: string): string {
  return `${publicPrefix()}${path}`;
}

/** The storage path of a URL this app uploaded, or null for anything else (e.g. a URL typed into the table). */
export function siteMediaPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = publicPrefix();
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return isSiteMediaPath(path) ? path : null;
}

export function isVideoPath(path: string) {
  return /\.(mp4|webm)$/.test(path);
}

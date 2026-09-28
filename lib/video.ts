/**
 * The dealership video on the homepage: a YouTube link, or a direct link to
 * an .mp4 / .webm file. Anything else is rejected when it is saved.
 */
export type VideoSource = { kind: 'youtube'; id: string } | { kind: 'file'; url: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function parseVideoUrl(input: string | null | undefined): VideoSource | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  let id: string | null = null;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'embed' || first === 'shorts' || first === 'live') id = second ?? null;
  }
  if (id !== null) return YOUTUBE_ID.test(id) ? { kind: 'youtube', id } : null;

  if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: 'file', url: url.toString() };
  return null;
}

import { parseVideoUrl } from '@/lib/video';
import { HomeSection } from './section';

/** Optional video from /admin/content. Loads nothing until it is near the screen. */
export function DealershipVideo({ url, dealershipName }: { url: string | null; dealershipName: string }) {
  const video = parseVideoUrl(url);
  if (!video) return null;
  const title = dealershipName ? `${dealershipName} video` : 'Dealership video';

  return (
    <HomeSection id="video" title="Take a look around" className="bg-card">
      <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-card border border-border bg-navy shadow-card">
        {video.kind === 'youtube' ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
            title={title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="size-full"
          />
        ) : (
          <video src={video.url} controls preload="none" playsInline aria-label={title} className="size-full" />
        )}
      </div>
    </HomeSection>
  );
}

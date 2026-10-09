import type { PublicSocialLink } from '@/lib/queries/homepage';
import { HomeSection } from './section';
import { SocialMarquee } from './social-marquee';
import { VideoReel } from './video-reel';

/**
 * Social media: the scrolling link banner (from /social_links) and the video reels
 * (from /homepage_content). Hidden when there is nothing to show.
 */
export function SocialVideos({ links, urls }: { links: PublicSocialLink[]; urls: string[] }) {
  if (links.length === 0 && urls.length === 0) return null;
  return (
    <HomeSection id="social" title="From our social media" tone="wash">
      <SocialMarquee links={links} />
      <VideoReel urls={urls} label="Social media video" className="md:grid-cols-4" />
    </HomeSection>
  );
}

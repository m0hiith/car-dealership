import { HomeSection } from './section';
import { VideoReel } from './video-reel';

/** Videos from the dealership's social media, from /homepage_content. Hidden when there are none. */
export function SocialVideos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <HomeSection id="social" title="From our social media" className="bg-card">
      <VideoReel urls={urls} label="Social media video" className="md:grid-cols-4" />
    </HomeSection>
  );
}

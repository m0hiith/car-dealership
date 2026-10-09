'use client';

import { useEffect, useRef, useState } from 'react';
import { VolumeIcon, VolumeOffIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Short portrait videos that all play muted on a loop while on screen. Tapping one
 * turns its sound on (and any other video's off); tapping it again mutes it.
 */
export function VideoReel({ urls, label, className }: { urls: string[]; label: string; className?: string }) {
  const [soundOn, setSoundOn] = useState<number | null>(null);
  if (urls.length === 0) return null;

  return (
    <ul className={cn('grid gap-3 md:gap-4', urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {urls.map((url, i) => (
        <li key={url}>
          <LoopingVideo
            src={url}
            label={`${label} ${i + 1}`}
            soundOn={soundOn === i}
            onToggle={() => setSoundOn((current) => (current === i ? null : i))}
          />
        </li>
      ))}
    </ul>
  );
}

function LoopingVideo({
  src,
  label,
  soundOn,
  onToggle,
}: {
  src: string;
  label: string;
  soundOn: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = !soundOn;
    // A tap is a user gesture, so playback with sound is allowed; if the browser still refuses, fall back to muted.
    if (soundOn) {
      void video.play().catch(() => {
        video.muted = true;
      });
    }
  }, [soundOn]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? `Mute ${label}` : `Play ${label} with sound`}
      className="group relative block aspect-9/16 w-full overflow-hidden rounded-card border border-border bg-brand shadow-card focus-visible:ring-2 focus-visible:ring-action focus-visible:outline-none"
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        className="size-full object-cover"
      />
      <span
        aria-hidden
        className="bg-black/60 absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full text-white"
      >
        {soundOn ? <VolumeIcon width={18} height={18} /> : <VolumeOffIcon width={18} height={18} />}
      </span>
    </button>
  );
}

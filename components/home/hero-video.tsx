'use client';

import { useEffect, useRef } from 'react';

/** Muted looping background video. Browsers sometimes skip `autoplay`, so start it explicitly. */
export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {
      // Autoplay blocked (e.g. data saver); the first frame stays visible.
    });
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
    />
  );
}

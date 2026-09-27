'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ExpandIcon, ImageIcon } from '@/components/ui/icons';
import { DialogCloseButton } from '@/components/ui/modal';
import { useDialog } from '@/components/ui/use-dialog';
import { cn } from '@/lib/cn';
import type { CarPhoto } from '@/lib/queries/car-detail';

/** Main photo column: full width below desktop, about two thirds of the 1280px container above it. */
const MAIN_SIZES = '(min-width: 1200px) 800px, 100vw';

/**
 * A native scroll-snap strip: swipes on touch screens with no JS, and the
 * index follows the scroll position however it moved.
 */
function useSnapCarousel(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (i: number, smooth = true) => {
    const el = ref.current;
    if (!el || count === 0) return;
    const next = Math.max(0, Math.min(count - 1, i));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reduced ? 'smooth' : 'instant' });
    setIndex(next);
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth))));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goTo(index - 1);
    else if (e.key === 'ArrowRight') goTo(index + 1);
    else return;
    e.preventDefault();
  };

  return { ref, index, goTo, onScroll, onKeyDown };
}

function ArrowButton({
  direction,
  onClick,
  disabled,
  className,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled: boolean;
  className?: string;
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-navy shadow-card focus-ring transition-opacity hover:bg-card disabled:opacity-0',
        direction === 'prev' ? 'left-3' : 'right-3',
        className,
      )}
    >
      <Icon width={22} height={22} />
    </button>
  );
}

function Counter({ index, count, className }: { index: number; count: number; className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute rounded-full bg-navy/80 px-2.5 py-1 text-label-md text-white tabular-nums',
        className,
      )}
    >
      {index + 1} / {count}
    </span>
  );
}

export function Gallery({ photos, alt }: { photos: CarPhoto[]; alt: string }) {
  const count = photos.length;
  const { ref: strip, index, goTo, onScroll, onKeyDown } = useSnapCarousel(count);
  const thumbs = useRef<HTMLUListElement>(null);
  const [lightbox, setLightbox] = useState(false);

  // Keep the selected thumbnail in view.
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left, behavior: 'instant' });
  }, [index]);

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-card bg-chip text-muted">
        <ImageIcon width={40} height={40} />
        <p className="text-body-md">Photos coming soon</p>
      </div>
    );
  }

  return (
    <section aria-label="Photos" aria-roledescription="carousel" className="flex flex-col gap-3">
      <div className="relative -mx-4 overflow-hidden bg-chip md:mx-0 md:rounded-card">
        <div
          ref={strip}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          aria-label={`${alt}: photo ${index + 1} of ${count}. Use the arrow keys to change photo.`}
          className="scrollbar-none flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-offset-[-2px]"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(true)}
              tabIndex={-1}
              aria-label={`Open photo ${i + 1} of ${count} full screen`}
              className="relative h-full w-full shrink-0 cursor-zoom-in snap-center snap-always"
            >
              <Image
                src={photo.url}
                alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                fill
                sizes={MAIN_SIZES}
                preload={i === 0}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {count > 1 && (
          <>
            <ArrowButton
              direction="prev"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="hidden md:inline-flex"
            />
            <ArrowButton
              direction="next"
              onClick={() => goTo(index + 1)}
              disabled={index === count - 1}
              className="hidden md:inline-flex"
            />
          </>
        )}
        <Counter index={index} count={count} className="bottom-3 left-3" />
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-card/90 px-3 text-label-md text-navy shadow-card focus-ring hover:bg-card"
        >
          <ExpandIcon width={14} height={14} />
          Full screen
        </button>
      </div>

      {count > 1 && (
        <ul ref={thumbs} className="scrollbar-none flex gap-2 overflow-x-auto" aria-label="Choose a photo">
          {photos.map((photo, i) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index || undefined}
                className="relative block h-14 w-20 overflow-hidden rounded-control border-2 border-transparent opacity-70 focus-ring transition-[opacity,border-color] hover:opacity-100 aria-[current=true]:border-action aria-[current=true]:opacity-100 md:h-16 md:w-24"
              >
                <Image src={photo.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <Lightbox
          photos={photos}
          alt={alt}
          startIndex={index}
          onClose={(last) => {
            setLightbox(false);
            goTo(last, false);
          }}
        />
      )}
    </section>
  );
}

function Lightbox({
  photos,
  alt,
  startIndex,
  onClose,
}: {
  photos: CarPhoto[];
  alt: string;
  startIndex: number;
  onClose: (index: number) => void;
}) {
  const count = photos.length;
  const { ref: strip, index, goTo, onScroll, onKeyDown } = useSnapCarousel(count);
  const close = () => onClose(index);
  const dialog = useDialog(true, close);

  // Runs after useDialog's showModal(), so the strip has its width.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    goTo(startIndex, false);
    strip.current?.focus();
  });

  return (
    <dialog
      {...dialog}
      aria-label={`${alt} photos`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-navy-dark p-0 text-white backdrop:bg-navy-dark"
    >
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <span className="text-label-lg tabular-nums">
            {index + 1} / {count}
          </span>
          <DialogCloseButton onClick={close} className="text-white hover:bg-white/10 hover:text-white" />
        </div>
        <div
          ref={strip}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          aria-label={`Photo ${index + 1} of ${count}. Use the arrow keys to change photo.`}
          className="scrollbar-none flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain focus-visible:outline-none"
        >
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative h-full w-full shrink-0 snap-center snap-always">
              <Image
                src={photo.url}
                alt={`${alt}, photo ${i + 1}`}
                fill
                sizes="100vw"
                loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
                className="object-contain"
              />
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <ArrowButton
              direction="prev"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="hidden md:inline-flex"
            />
            <ArrowButton
              direction="next"
              onClick={() => goTo(index + 1)}
              disabled={index === count - 1}
              className="hidden md:inline-flex"
            />
          </>
        )}
        <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
      </div>
    </dialog>
  );
}

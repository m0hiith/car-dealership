'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { ImageIcon, RetryIcon, Spinner, TrashIcon } from '@/components/ui/icons';
import { createSiteMediaUpload, discardSiteMedia } from '@/lib/actions/content';
import { cn } from '@/lib/cn';
import { PhotoError, preparePhoto, uploadPhoto } from '@/lib/images/prepare-photo';
import { siteMediaUrl, type SiteMediaKind } from '@/lib/site-media';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { photoFileSchema, PHOTO_ACCEPT } from '@/lib/validation/car';
import { VIDEO_ACCEPT, videoFileSchema, type MediaChange } from '@/lib/validation/content';

/** A media field's value: what to send on save, and what to preview. */
export type MediaState = { change: MediaChange; url: string | null; type: 'image' | 'video' };

export function savedMedia(current: { url: string; type: 'image' | 'video' } | null): MediaState {
  return { change: 'keep', url: current?.url ?? null, type: current?.type ?? 'image' };
}

type Upload =
  | { status: 'working'; progress: number }
  | { status: 'error'; message: string; /** Set when retrying could help. */ file: File | null }
  | null;

const PREVIEW = {
  wide: 'aspect-video w-full max-w-md rounded-card',
  square: 'size-28 rounded-card',
  round: 'size-20 rounded-full',
} as const;

/**
 * One uploaded file in the site-media bucket (hero, logo, testimonial photo).
 * Photos are compressed to WebP in the browser first; videos go up as they
 * are. The file only replaces the saved one when the form is saved.
 */
export function MediaField({
  kind,
  label,
  hint,
  value,
  onChange,
  onBusyChange,
  allowVideo = false,
  maxEdge,
  preview = 'wide',
  error,
}: {
  kind: SiteMediaKind;
  label: string;
  hint?: string;
  value: MediaState;
  onChange: (next: MediaState) => void;
  /** True while a file is being prepared or uploaded. */
  onBusyChange?: (busy: boolean) => void;
  allowVideo?: boolean;
  /** Longest edge of the compressed photo. */
  maxEdge?: number;
  preview?: keyof typeof PREVIEW;
  error?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload>(null);
  const busy = upload?.status === 'working';

  // Leaving the form (closing the dialog, navigating away) without saving:
  // delete the file uploaded for it. The server keeps any file a saved row uses.
  const unsavedPath = useRef<string | null>(null);
  useEffect(() => {
    unsavedPath.current = typeof value.change === 'object' ? value.change.path : null;
  }, [value.change]);
  useEffect(
    () => () => {
      if (unsavedPath.current) void discardSiteMedia(unsavedPath.current);
    },
    [],
  );

  function setBusy(next: Upload) {
    setUpload(next);
    onBusyChange?.(next?.status === 'working');
  }

  /** Deletes a file uploaded in this session that is being replaced or removed before saving. */
  function discardUnsaved() {
    if (typeof value.change === 'object') void discardSiteMedia(value.change.path);
  }

  async function handleFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    const check = isVideo
      ? allowVideo
        ? videoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size })
        : null
      : photoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
    if (!check?.success) {
      const message = check?.error.issues[0]?.message ?? 'Only JPG, PNG, WebP or HEIC photos can be used here.';
      setBusy({ status: 'error', message, file: null });
      return;
    }

    setBusy({ status: 'working', progress: 0 });
    try {
      const blob = isVideo ? file : await preparePhoto(file, { maxEdge });
      const ext = isVideo ? (file.type === 'video/webm' ? 'webm' : 'mp4') : 'webp';
      const target = await createSiteMediaUpload({ kind, ext });
      if (!target.ok) throw new PhotoError(target.error);
      await uploadPhoto(target.signedUrl, blob, {
        anonKey: getSupabasePublicEnv().anonKey,
        fileName: `upload.${ext}`,
        onProgress: (progress) => setUpload({ status: 'working', progress }),
      });
      discardUnsaved();
      onChange({ change: { path: target.path }, url: siteMediaUrl(target.path), type: isVideo ? 'video' : 'image' });
      setBusy(null);
    } catch (e) {
      const message = e instanceof PhotoError ? e.message : 'Something went wrong with this file. Try again.';
      setBusy({ status: 'error', message, file });
    }
  }

  function remove() {
    discardUnsaved();
    setBusy(null);
    onChange({ change: 'remove', url: null, type: 'image' });
  }

  const message = upload?.status === 'error' ? upload.message : error;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-lg text-navy" id={`${inputId}-label`}>
        {label}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden border border-border bg-chip text-muted',
            PREVIEW[preview],
          )}
        >
          {value.url && value.type === 'video' && (
            <video src={value.url} muted playsInline preload="metadata" className="size-full object-cover" />
          )}
          {value.url && value.type === 'image' && (
            <Image
              src={value.url}
              alt=""
              fill
              sizes={preview === 'wide' ? '448px' : '112px'}
              className={preview === 'wide' ? 'object-cover' : 'object-contain'}
            />
          )}
          {!value.url && <ImageIcon width={28} height={28} />}
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/60 text-white">
              <Spinner width={20} height={20} />
              <span className="text-label-md tabular-nums">{Math.round(upload.progress * 100)}%</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={allowVideo ? `${PHOTO_ACCEPT},${VIDEO_ACCEPT}` : PHOTO_ACCEPT}
              aria-labelledby={`${inputId}-label`}
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleFile(file);
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {value.url ? 'Replace' : 'Upload'}
            </Button>
            {upload?.status === 'error' && upload.file && (
              <Button variant="ghost" size="sm" onClick={() => upload.file && void handleFile(upload.file)}>
                <RetryIcon width={16} height={16} />
                Retry
              </Button>
            )}
            {value.url && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
                <TrashIcon width={16} height={16} />
                Remove
              </Button>
            )}
          </div>
          {hint && !message && <p className="text-body-sm text-muted">{hint}</p>}
          {message && (
            <p className="text-body-sm font-medium text-danger" role="alert">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

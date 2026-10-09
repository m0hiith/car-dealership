'use client';

/* eslint-disable @next/next/no-img-element -- previews are local blob: URLs, which next/image cannot optimise */

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui';
import { CameraIcon, RetryIcon, Spinner, TrashIcon } from '@/components/ui/icons';
import { createSellPhotoUpload, discardSellPhoto } from '@/lib/actions/sell';
import { PhotoError, preparePhoto, uploadPhoto } from '@/lib/images/prepare-photo';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { photoFileSchema, PHOTO_ACCEPT } from '@/lib/validation/car';
import { MAX_SELL_PHOTOS } from '@/lib/validation/sell';

export type SellPhoto = {
  key: string;
  file: File;
  /** Local preview (blob: URL), revoked when the photo is removed. */
  preview: string | null;
} & ({ status: 'working'; progress: number } | { status: 'done'; path: string } | { status: 'error'; message: string });

type Update = (key: string, change: Partial<SellPhoto> & Pick<SellPhoto, 'status'>) => void;

/** Compress in the browser, ask the server for a one-time URL, upload with progress. */
async function processPhoto(photo: SellPhoto, update: Update, anonKey: string) {
  try {
    const blob = await preparePhoto(photo.file);
    const preview = URL.createObjectURL(blob);
    update(photo.key, { status: 'working', progress: 0.05, preview } as Partial<SellPhoto> & { status: 'working' });
    const target = await createSellPhotoUpload({ type: blob.type, size: blob.size });
    if (!target.ok) throw new PhotoError(target.error);
    await uploadPhoto(target.signedUrl, blob, {
      anonKey,
      onProgress: (fraction) => update(photo.key, { status: 'working', progress: Math.max(0.05, fraction) }),
    });
    update(photo.key, { status: 'done', path: target.path } as Partial<SellPhoto> & { status: 'done' });
  } catch (err) {
    const message = err instanceof PhotoError ? err.message : 'Upload failed. Check your connection and try again.';
    update(photo.key, { status: 'error', message } as Partial<SellPhoto> & { status: 'error' });
  }
}

/** Step 4: up to 8 optional photos. */
export function SellPhotos({
  photos,
  setPhotos,
  error,
}: {
  photos: SellPhoto[];
  setPhotos: (update: (current: SellPhoto[]) => SellPhoto[]) => void;
  error?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_SELL_PHOTOS - photos.length;

  const update: Update = (key, change) =>
    setPhotos((current) => current.map((p) => (p.key === key ? ({ ...p, ...change } as SellPhoto) : p)));

  // Free preview memory when the form goes away.
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      for (const p of latest.current) if (p.preview) URL.revokeObjectURL(p.preview);
    },
    [],
  );

  function add(files: FileList | null) {
    if (!files) return;
    const { anonKey } = getSupabasePublicEnv();
    const added: SellPhoto[] = Array.from(files)
      .slice(0, remaining)
      .map((file) => {
        const key = crypto.randomUUID();
        const check = photoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
        return check.success
          ? { key, file, preview: null, status: 'working', progress: 0 }
          : {
              key,
              file,
              preview: null,
              status: 'error',
              message: check.error.issues[0]?.message ?? 'Only JPG, PNG, WebP or HEIC photos can be added.',
            };
      });
    setPhotos((current) => [...current, ...added]);
    for (const photo of added) if (photo.status === 'working') void processPhoto(photo, update, anonKey);
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(photo: SellPhoto) {
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    if (photo.status === 'done') void discardSellPhoto(photo.path);
    setPhotos((current) => current.filter((p) => p.key !== photo.key));
  }

  function retry(photo: SellPhoto) {
    const next = { ...photo, status: 'working', progress: 0 } as SellPhoto;
    update(photo.key, { status: 'working', progress: 0 } as Partial<SellPhoto> & { status: 'working' });
    void processPhoto(next, update, getSupabasePublicEnv().anonKey);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-muted">
        Optional, but photos help us give you a quicker answer. Add up to {MAX_SELL_PHOTOS}: front, back, both sides,
        the interior and the odometer work well.
      </p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <li
              key={photo.key}
              className="relative aspect-4/3 overflow-hidden rounded-control border border-border bg-chip"
            >
              {photo.preview && <img src={photo.preview} alt={`Photo ${i + 1}`} className="size-full object-cover" />}
              {photo.status === 'working' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand/50 text-white">
                  <Spinner width={20} height={20} />
                  <span className="text-label-sm">{Math.round(photo.progress * 100)}%</span>
                  <span className="sr-only">Uploading photo {i + 1}</span>
                </div>
              )}
              {photo.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger-soft p-2 text-center">
                  <span role="alert" className="text-body-sm text-danger">
                    {photo.message}
                  </span>
                  <Button variant="ghost" size="sm" className="bg-card" onClick={() => retry(photo)}>
                    <RetryIcon width={14} height={14} />
                    Retry
                  </Button>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(photo)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-card text-navy shadow-card focus-ring hover:bg-chip"
              >
                <TrashIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => add(e.target.files)}
          />
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-input bg-card px-4 py-8 text-center transition-colors hover:border-action hover:bg-wash has-[:focus-visible]:border-action"
          >
            <CameraIcon width={24} height={24} className="text-action-ink" />
            <span className="text-label-lg text-navy">
              {photos.length ? `Add more photos (${remaining} left)` : 'Add photos'}
            </span>
            <span className="text-body-sm text-muted">JPG, PNG, WebP or HEIC. We shrink them before uploading.</span>
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { useEffect, useId, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { Badge, Button } from '@/components/ui';
import { CameraIcon, GripIcon, ImageIcon, RetryIcon, Spinner, StarIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { createCarPhotoUpload, discardCarPhoto } from '@/lib/actions/cars';
import { cn } from '@/lib/cn';
import { PhotoError, preparePhoto, uploadPhoto } from '@/lib/images/prepare-photo';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { MAX_PHOTOS, PHOTO_ACCEPT, photoFileSchema } from '@/lib/validation/car';

export type PhotoItem = {
  /** Stable id for React and drag-and-drop. */
  key: string;
  /** Storage path once uploaded (or for photos already saved). */
  path: string | null;
  /** Object URL of the compressed photo, or the public URL of a saved one. */
  previewUrl: string | null;
  status: 'processing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  /** Kept until the upload succeeds so it can be retried. */
  file?: File;
};

/** Photos already saved to the car, in display order. */
export function savedPhotoItems(photos: Array<{ path: string; url: string }>): PhotoItem[] {
  return photos.map((p) => ({ key: p.path, path: p.path, previewUrl: p.url, status: 'done', progress: 1 }));
}

/** Compress + upload at most this many photos at once; phones run out of memory otherwise. */
const CONCURRENCY = 2;

export function PhotoUploader({
  id,
  carId,
  photos,
  setPhotos,
  error,
}: {
  id: string;
  carId: string;
  photos: PhotoItem[];
  setPhotos: Dispatch<SetStateAction<PhotoItem[]>>;
  error?: string;
}) {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  // dnd-kit's own ids come from a global counter and differ between server and client.
  const dndId = useId();
  const photosRef = useRef(photos);
  const queue = useRef<Array<() => Promise<void>>>([]);
  const running = useRef(0);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Release object URLs when leaving the page.
  useEffect(
    () => () => {
      for (const p of photosRef.current) if (p.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl);
    },
    [],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press and hold to drag on touch screens, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(key: string, patch: Partial<PhotoItem>) {
    setPhotos((list) =>
      list.map((p) => {
        if (p.key !== key) return p;
        if (patch.previewUrl && p.previewUrl?.startsWith('blob:') && p.previewUrl !== patch.previewUrl) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return { ...p, ...patch };
      }),
    );
  }

  function pump() {
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const job = queue.current.shift()!;
      running.current++;
      void job().finally(() => {
        running.current--;
        pump();
      });
    }
  }

  function enqueue(key: string, file: File) {
    queue.current.push(() => processPhoto(key, file));
    pump();
  }

  async function processPhoto(key: string, file: File) {
    const stillThere = () => photosRef.current.some((p) => p.key === key);
    if (!stillThere()) return;
    update(key, { status: 'processing', progress: 0, error: undefined });
    try {
      const blob = await preparePhoto(file);
      if (!stillThere()) return;
      update(key, { previewUrl: URL.createObjectURL(blob), status: 'uploading' });

      const target = await createCarPhotoUpload(carId);
      if (!target.ok) throw new PhotoError(target.error);
      await uploadPhoto(target.signedUrl, blob, {
        anonKey: getSupabasePublicEnv().anonKey,
        onProgress: (fraction) => update(key, { progress: fraction }),
      });

      if (!stillThere()) {
        // Removed while uploading: clean up the file straight away.
        void discardCarPhoto(carId, target.path);
        return;
      }
      update(key, { status: 'done', path: target.path, progress: 1, file: undefined });
    } catch (e) {
      const message = e instanceof PhotoError ? e.message : 'Something went wrong with this photo. Try again.';
      update(key, { status: 'error', error: message });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photosRef.current.length;
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const check = photoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
      if (!check.success) rejected.push(`${file.name}: ${check.error.issues[0]?.message}`);
      else accepted.push(file);
    }
    const toAdd = accepted.slice(0, Math.max(0, room));

    if (accepted.length > toAdd.length) {
      toast({
        tone: 'error',
        title: `A car can have up to ${MAX_PHOTOS} photos`,
        description: `${accepted.length - toAdd.length} photo(s) were not added.`,
      });
    }
    if (rejected.length > 0) {
      toast({
        tone: 'error',
        title: rejected.length === 1 ? 'A file was skipped' : `${rejected.length} files were skipped`,
        description: rejected.slice(0, 3).join(' · '),
      });
    }

    const items: PhotoItem[] = toAdd.map((file) => ({
      key: crypto.randomUUID(),
      path: null,
      previewUrl: null,
      status: 'processing',
      progress: 0,
      file,
    }));
    if (items.length === 0) return;
    photosRef.current = [...photosRef.current, ...items];
    setPhotos((list) => [...list, ...items]);
    for (const item of items) enqueue(item.key, item.file!);
  }

  function remove(key: string) {
    const photo = photosRef.current.find((p) => p.key === key);
    if (!photo) return;
    if (photo.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl);
    // Deletes the file only if no saved car uses it; saved photos go when the car is saved.
    if (photo.path) void discardCarPhoto(carId, photo.path);
    photosRef.current = photosRef.current.filter((p) => p.key !== key);
    setPhotos((list) => list.filter((p) => p.key !== key));
  }

  function makeCover(key: string) {
    setPhotos((list) => {
      const index = list.findIndex((p) => p.key === key);
      return index > 0 ? arrayMove(list, index, 0) : list;
    });
  }

  function retry(key: string) {
    const photo = photosRef.current.find((p) => p.key === key);
    if (photo?.file) enqueue(key, photo.file);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setPhotos((list) => {
      const from = list.findIndex((p) => p.key === active.id);
      const to = list.findIndex((p) => p.key === over.id);
      return from < 0 || to < 0 ? list : arrayMove(list, from, to);
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  const busy = photos.filter((p) => p.status === 'processing' || p.status === 'uploading').length;

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-card border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-action bg-action-soft' : 'border-input bg-canvas',
          error && 'border-danger/60',
        )}
      >
        <p className="hidden text-body-md text-muted pointer-fine:block">Drag photos here, or</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <FilePickerButton
            id={id}
            label="Choose photos"
            icon={<ImageIcon width={18} height={18} />}
            variant="primary"
            onFiles={addFiles}
          />
          {/* Opens the camera directly on phones. */}
          <FilePickerButton
            label="Take photo"
            icon={<CameraIcon width={18} height={18} />}
            variant="ghost"
            capture
            onFiles={addFiles}
            className="pointer-fine:hidden"
          />
        </div>
        <p className="text-body-sm text-muted">
          JPG, PNG, WebP or HEIC, up to 30 MB each. Aim for 10–20 photos: front, rear, both sides, interior, dashboard,
          tyres and engine.
        </p>
      </div>

      {photos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted">
            <span>
              <strong className="font-semibold text-chip-ink">{photos.length}</strong> photo
              {photos.length === 1 ? '' : 's'}
              {busy > 0 && ` · uploading ${busy}…`}
            </span>
            <span>
              The first photo is the cover. <span className="pointer-coarse:hidden">Drag to reorder.</span>
              <span className="pointer-fine:hidden">Press and hold to reorder.</span>
            </span>
          </div>
          <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={photos.map((p) => p.key)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo, index) => (
                  <SortablePhoto
                    key={photo.key}
                    photo={photo}
                    index={index}
                    onRemove={() => remove(photo.key)}
                    onMakeCover={() => makeCover(photo.key)}
                    onRetry={() => retry(photo.key)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}

      {error && (
        <p id={`${id}-error`} className="text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FilePickerButton({
  id,
  label,
  icon,
  variant,
  capture,
  onFiles,
  className,
}: {
  id?: string;
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'ghost';
  capture?: boolean;
  onFiles: (files: FileList) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button id={id} variant={variant} onClick={() => input.current?.click()} className={className}>
        {icon}
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept={capture ? 'image/*' : PHOTO_ACCEPT}
        multiple={!capture}
        capture={capture ? 'environment' : undefined}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = ''; // allow picking the same file again
        }}
      />
    </>
  );
}

function SortablePhoto({
  photo,
  index,
  onRemove,
  onMakeCover,
  onRetry,
}: {
  photo: PhotoItem;
  index: number;
  onRemove: () => void;
  onMakeCover: () => void;
  onRetry: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.key });
  const isCover = index === 0;
  const label = `Photo ${index + 1}${isCover ? ' (cover)' : ''}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative overflow-hidden rounded-card border bg-chip',
        isCover ? 'border-action' : 'border-border',
        isDragging && 'z-10 shadow-overlay',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${label}. Press space to pick up and use arrow keys to move.`}
        className="relative aspect-[4/3] cursor-grab touch-manipulation focus-ring active:cursor-grabbing"
      >
        {photo.previewUrl ? (
          <Image
            src={photo.previewUrl}
            alt={label}
            fill
            sizes="(min-width: 1200px) 240px, (min-width: 640px) 30vw, 50vw"
            unoptimized={photo.previewUrl.startsWith('blob:')}
            className={cn('object-cover', photo.status !== 'done' && 'opacity-60')}
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageIcon width={28} height={28} />
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1">
          {isCover ? (
            <Badge tone="blue" className="shadow-card">
              Cover
            </Badge>
          ) : (
            <Badge className="shadow-card">{index + 1}</Badge>
          )}
        </div>
        <GripIcon
          width={18}
          height={18}
          className="absolute top-2 right-2 rounded-sm bg-card/80 text-muted pointer-coarse:hidden"
        />

        {photo.status !== 'done' && photo.status !== 'error' && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-navy/70 px-2 py-1.5 text-white">
            <span className="flex items-center gap-1.5 text-label-sm">
              <Spinner width={12} height={12} />
              {photo.status === 'processing' ? 'Preparing…' : `Uploading ${Math.round(photo.progress * 100)}%`}
            </span>
            <span
              className="h-1 overflow-hidden rounded-full bg-white/30"
              role="progressbar"
              aria-label={`${label} upload`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(photo.progress * 100)}
            >
              <span
                className="block h-full rounded-full bg-highlight transition-[width]"
                style={{ width: `${Math.round(photo.progress * 100)}%` }}
              />
            </span>
          </div>
        )}

        {photo.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger-soft/95 p-2 text-center">
            <p className="text-body-sm font-medium text-danger-dark">{photo.error}</p>
            {photo.file && (
              <Button size="sm" variant="ghost" onClick={onRetry} className="bg-card">
                <RetryIcon width={14} height={14} />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border bg-card p-1">
        {isCover ? (
          <span className="flex h-9 items-center gap-1.5 px-2 text-label-md text-action-ink">
            <StarIcon width={14} height={14} />
            Cover photo
          </span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={onMakeCover}
            className="border-0 px-2"
            disabled={photo.status !== 'done'}
          >
            <StarIcon width={14} height={14} />
            Make cover
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove ${label.toLowerCase()}`}
          className="w-9 border-0 px-0 text-danger hover:text-danger-dark"
        >
          <TrashIcon width={16} height={16} />
        </Button>
      </div>
    </li>
  );
}

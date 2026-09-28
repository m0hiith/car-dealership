import { isHeicFile, preparedPhotoSchema } from '@/lib/validation/car';

/**
 * Browser-only: turns a phone photo into a WebP of at most 1920px on the long
 * edge before it is uploaded (PRODUCT_SPEC §6.3). A 12 MP phone photo of
 * 4-8 MB usually ends up around 200-500 KB.
 */

const MAX_EDGE = 1920;
const WEBP_QUALITY = 0.82;

export class PhotoError extends Error {}

export async function preparePhoto(file: File, { maxEdge = MAX_EDGE }: { maxEdge?: number } = {}): Promise<Blob> {
  const source = await decode(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoError('Your browser could not process this photo.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    // Browsers without a WebP encoder (older iOS Safari) silently return PNG.
    // Fall back to a WASM encoder, loaded only when needed.
    if (!blob || blob.type !== 'image/webp') {
      const { default: encode } = await import('@jsquash/webp/encode');
      const buffer = await encode(ctx.getImageData(0, 0, width, height), { quality: WEBP_QUALITY * 100 });
      blob = new Blob([buffer], { type: 'image/webp' });
    }

    // Free the pixel buffer now; phones run out of memory with many large canvases.
    canvas.width = 0;
    canvas.height = 0;

    const check = preparedPhotoSchema.safeParse({ type: blob.type, size: blob.size });
    if (!check.success) throw new PhotoError(check.error.issues[0]?.message ?? 'The photo could not be converted.');
    return blob;
  } finally {
    if ('close' in source) source.close();
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // Applies the EXIF rotation, so portrait phone photos stay upright.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Chrome and Firefox cannot decode HEIC; Safari can (handled above).
    if (isHeicFile(file)) {
      try {
        const { heicTo } = await import('heic-to/next');
        return await heicTo({ blob: file, type: 'bitmap', options: { imageOrientation: 'from-image' } });
      } catch {
        throw new PhotoError('This HEIC photo could not be converted. Try exporting it as JPG.');
      }
    }
    throw new PhotoError('This file could not be opened as a photo.');
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Uploads to a Supabase signed upload URL with XHR, because fetch cannot
 * report upload progress. Also used for site-media videos, which are sent
 * as they are.
 */
export function uploadPhoto(
  signedUrl: string,
  blob: Blob,
  {
    anonKey,
    onProgress,
    signal,
    fileName = 'photo.webp',
  }: { anonKey: string; onProgress: (fraction: number) => void; signal?: AbortSignal; fileName?: string },
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new PhotoError('Upload failed. Check your connection and try again.'));
    };
    xhr.onerror = () => reject(new PhotoError('Upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    const body = new FormData();
    // File names are random UUIDs and never reused, so they can be cached for a year.
    body.append('cacheControl', '31536000');
    body.append('', blob, fileName);
    xhr.send(body);
  });
}

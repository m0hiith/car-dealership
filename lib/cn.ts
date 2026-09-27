import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom theme keys (app/globals.css) so that, for
// example, `text-body-md` and `text-navy` are not treated as conflicting.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'headline-xl',
        'headline-xl-mobile',
        'headline-lg',
        'headline-lg-mobile',
        'headline-md',
        'headline-sm',
        'body-lg',
        'body-md',
        'body-sm',
        'label-lg',
        'label-md',
        'label-sm',
      ],
      radius: ['sm', 'control', 'card'],
      shadow: ['level-1', 'level-2', 'level-3', 'card', 'card-hover', 'overlay'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

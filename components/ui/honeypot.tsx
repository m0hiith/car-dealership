import type { Ref } from 'react';
import { HONEYPOT_FIELD } from '@/lib/validation/lead';

/**
 * Anti-spam trap: an input people never see or reach, which bots tend to
 * fill. The name and label are deliberately meaningless, and password
 * managers are told to skip it: browser autofill once filled a field
 * labelled "Company website" and real requests were dropped as spam.
 */
export function Honeypot({ id, inputRef }: { id: string; inputRef?: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        ref={inputRef}
        id={id}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
    </div>
  );
}

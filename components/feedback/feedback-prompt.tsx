'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Input, Textarea } from '@/components/ui';
import { Honeypot } from '@/components/ui/honeypot';
import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import { submitFeedback } from '@/lib/actions/feedback';
import { cn } from '@/lib/cn';
import { FEEDBACK_RATINGS, FEEDBACK_SNOOZE_DAYS, type FeedbackField } from '@/lib/validation/feedback';
import { HONEYPOT_FIELD } from '@/lib/validation/lead';

/** Browsing time this tab session, in ms (sessionStorage: shared across pages, gone when the tab closes). */
const ELAPSED_KEY = 'feedback:elapsed-ms';
/** Don't show again before this time, in ms (localStorage: per visitor, per browser). */
const HIDE_UNTIL_KEY = 'feedback:hide-until';
const TICK_MS = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Storage can be missing or throw (private mode, blocked site data). Then the
// popup simply counts from zero on each page and may show again: harmless.
function read(storage: () => Storage, key: string): number {
  try {
    return Number(storage().getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function write(storage: () => Storage, key: string, value: number) {
  try {
    storage().setItem(key, String(value));
  } catch {
    // Ignore: see above.
  }
}
const session = () => window.sessionStorage;
const local = () => window.localStorage;

/**
 * Asks "How's your experience so far?" once the visitor has spent the
 * configured time on the site (visible time only, added up across pages).
 * Bottom-right card on desktop, bottom sheet on phones. Never on /admin.
 * Not a modal: it does not take focus or block the page.
 */
export function FeedbackPrompt({ delaySeconds }: { delaySeconds: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    if (read(local, HIDE_UNTIL_KEY) > Date.now()) return;

    const delayMs = delaySeconds * 1000;
    let elapsed = read(session, ELAPSED_KEY);
    const show = () => {
      // Shown counts as seen: don't ask again for 30 days, whatever they do next.
      write(local, HIDE_UNTIL_KEY, Date.now() + FEEDBACK_SNOOZE_DAYS * DAY_MS);
      setOpen(true);
    };
    if (elapsed >= delayMs) {
      show();
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      elapsed += TICK_MS;
      write(session, ELAPSED_KEY, elapsed);
      if (elapsed >= delayMs) {
        window.clearInterval(timer);
        show();
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [pathname, delaySeconds]);

  if (!open || pathname.startsWith('/admin')) return null;
  return <FeedbackCard pageUrl={pathname} onClose={() => setOpen(false)} />;
}

function FeedbackCard({ pageUrl, onClose }: { pageUrl: string; onClose: () => void }) {
  const headingId = useId();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FeedbackField, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) {
      setErrors({ rating: 'Choose a rating.' });
      return;
    }
    setSending(true);
    setFormError(undefined);
    try {
      const result = await submitFeedback({
        rating,
        comment,
        phone,
        pageUrl,
        [HONEYPOT_FIELD]: honeypot.current?.value ?? '',
      });
      if (result.ok) {
        setSent(true);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    } catch {
      setFormError('Could not send. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-card border border-border bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-overlay',
        'md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-card md:p-5',
        'motion-safe:animate-[feedback-in_300ms_ease-out]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="text-headline-sm text-navy">
          {sent ? 'Thank you!' : "How's your experience so far?"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feedback"
          className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted focus-ring hover:bg-chip hover:text-navy"
        >
          <CloseIcon width={20} height={20} />
        </button>
      </div>

      {sent ? (
        <div className="flex flex-col items-start gap-3 pt-2" role="status">
          <p className="flex items-center gap-2 text-body-md text-chip-ink">
            <span
              className="flex size-7 items-center justify-center rounded-full bg-trust-soft text-trust-ink"
              aria-hidden
            >
              <CheckIcon width={16} height={16} />
            </span>
            Your feedback helps us improve.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pt-3">
          {formError && <Alert>{formError}</Alert>}

          <Honeypot id="feedback-hp" inputRef={honeypot} />

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Rating</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {FEEDBACK_RATINGS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-control border py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action',
                    rating === r.value
                      ? 'border-action bg-action-soft'
                      : 'border-border hover:border-tint hover:bg-canvas',
                  )}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={r.value}
                    checked={rating === r.value}
                    onChange={() => {
                      setRating(r.value);
                      setErrors((e) => ({ ...e, rating: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span className="text-2xl leading-none" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className={cn('text-label-sm', rating === r.value ? 'text-action-ink' : 'text-muted')}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.rating && (
              <p role="alert" className="text-body-sm text-danger">
                {errors.rating}
              </p>
            )}
          </fieldset>

          {rating !== null && (
            <>
              <Textarea
                label="Anything we could do better? (optional)"
                rows={3}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                error={errors.comment}
              />
              <Input
                label="Mobile number (optional)"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                maxLength={16}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                hint="Only if you'd like us to get back to you."
              />
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Not now
            </Button>
            <Button type="submit" size="sm" loading={sending} disabled={rating === null}>
              Send feedback
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

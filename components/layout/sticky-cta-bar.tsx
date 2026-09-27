import type { ContactLinks } from '@/components/cars/contact-actions';
import { EnquireButton } from '@/components/leads/enquiry';
import { buttonStyles } from '@/components/ui';
import { PhoneIcon, QuoteIcon } from '@/components/ui/icons';

/**
 * Phones only: WhatsApp, Call and Enquire pinned to the bottom of the screen
 * (elevation level 3). Render it last in the page: it is sticky, not fixed,
 * so it comes to rest above the footer instead of covering it.
 */
export function StickyCtaBar({ whatsapp, call }: ContactLinks) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-overlay md:hidden">
      <div className="flex gap-2">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener"
            className={buttonStyles({ variant: 'secondary', className: 'flex-1 px-2' })}
          >
            <QuoteIcon width={18} height={18} />
            WhatsApp
          </a>
        )}
        {call && (
          <a href={call} className={buttonStyles({ variant: 'ghost', className: 'flex-1 px-2' })}>
            <PhoneIcon width={18} height={18} />
            Call
          </a>
        )}
        <EnquireButton className="flex-1 px-2">Enquire</EnquireButton>
      </div>
    </div>
  );
}

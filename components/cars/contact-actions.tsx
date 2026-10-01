import { EnquireButton } from '@/components/leads/enquiry';
import { buttonStyles } from '@/components/ui';
import { MailIcon, PhoneIcon, QuoteIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type ContactLinks = { whatsapp: string | null; call: string | null };

/** Enquire Now, WhatsApp and Call Now, stacked, for the detail page summary card. */
export function ContactActions({ whatsapp, call, className }: ContactLinks & { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <EnquireButton size="lg" fullWidth>
        <MailIcon width={18} height={18} />
        Enquire Now
      </EnquireButton>
      {(whatsapp || call) && (
        <div className="grid grid-cols-2 gap-3 *:only:col-span-2">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener" className={buttonStyles({ variant: 'whatsapp' })}>
              <QuoteIcon width={18} height={18} />
              WhatsApp
            </a>
          )}
          {call && (
            <a href={call} className={buttonStyles({ variant: 'ghost' })}>
              <PhoneIcon width={18} height={18} />
              Call Now
            </a>
          )}
        </div>
      )}
    </div>
  );
}

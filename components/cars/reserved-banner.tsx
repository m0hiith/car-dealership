import { EnquireButton } from '@/components/leads/enquiry';

/** Amber is for Reserved only (CLAUDE.md §4). */
export function ReservedBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-reserved bg-reserved-soft px-4 py-3 text-reserved-ink sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-lg font-semibold">This car is reserved — enquire for similar cars</p>
      <EnquireButton
        size="sm"
        variant="ghost"
        className="border-reserved text-reserved-ink hover:border-reserved-ink hover:bg-card"
      >
        Enquire
      </EnquireButton>
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  buttonStyles,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { SearchIcon } from '@/components/ui/icons';
import { formatKm, formatPriceFull, formatPriceLakh } from '@/lib/format';
import { BottomSheetDemo, ChipDemo, LoadingButtonDemo, ModalDemo, ToastDemo } from './demos';

// Design reference, not part of the product. 404s in production (see the
// NODE_ENV check below); noindex here covers `next dev` too.
export const metadata: Metadata = {
  title: 'Styleguide',
  robots: { index: false, follow: false },
};

const colours = [
  { name: 'navy', hex: '#0B2857', swatch: 'bg-navy', use: 'Primary: titles, primary buttons, footer' },
  { name: 'navy-dark', hex: '#071C3F', swatch: 'bg-navy-dark', use: 'Primary hover, admin sidebar' },
  { name: 'action', hex: '#087CF0', swatch: 'bg-action', use: 'Secondary: accents, rails, focus, selections' },
  { name: 'highlight', hex: '#4AA3F5', swatch: 'bg-highlight', use: 'Accents, active states, rails' },
  { name: 'trust', hex: '#35B20D', swatch: 'bg-trust', use: 'Accent: logo tick, genuine trust signals' },
  { name: 'trust-light', hex: '#5CCB33', swatch: 'bg-trust-light', use: 'Trust accents' },
  { name: 'reserved', hex: '#F59E0B', swatch: 'bg-reserved', use: 'Reserved badge / banner only' },
  { name: 'canvas', hex: '#F5F8FD', swatch: 'bg-canvas', use: 'Admin background, hover fills' },
  { name: 'card', hex: '#FFFFFF', swatch: 'bg-card', use: 'Cards, panels, inputs' },
  { name: 'border', hex: '#E2E8F0', swatch: 'bg-border', use: 'Default borders' },
  { name: 'muted', hex: '#64748B', swatch: 'bg-muted', use: 'Secondary text' },
  { name: 'chip', hex: '#F1F5F9', swatch: 'bg-chip', use: 'Chip background' },
  { name: 'chip-ink', hex: '#334155', swatch: 'bg-chip-ink', use: 'Body and chip text' },
  { name: 'input', hex: '#CBD5E1', swatch: 'bg-input', use: 'Input border' },
  { name: 'control', hex: '#94A3B8', swatch: 'bg-control', use: 'Checkbox border' },
  { name: 'tint', hex: '#BAE6FD', swatch: 'bg-tint', use: 'Hover border (level 2)' },
  { name: 'danger', hex: '#DC2626', swatch: 'bg-danger', use: 'Destructive actions, errors' },
];

const typeScale = [
  { token: 'headline-xl', spec: '44/52 · 800 · -0.02em', className: 'text-headline-xl' },
  { token: 'headline-xl-mobile', spec: '30/38 · 800 · -0.02em', className: 'text-headline-xl-mobile' },
  { token: 'headline-lg', spec: '32/40 · 700 · -0.015em', className: 'text-headline-lg' },
  { token: 'headline-lg-mobile', spec: '24/32 · 700 · -0.01em', className: 'text-headline-lg-mobile' },
  { token: 'headline-md', spec: '22/30 · 700', className: 'text-headline-md' },
  { token: 'headline-sm', spec: '18/26 · 600', className: 'text-headline-sm' },
  { token: 'body-lg', spec: '16/24 · 400', className: 'text-body-lg' },
  { token: 'body-md', spec: '14/20 · 400', className: 'text-body-md' },
  { token: 'body-sm', spec: '12/18 · 400', className: 'text-body-sm' },
  { token: 'label-lg', spec: '14/20 · 600 · 0.01em', className: 'text-label-lg' },
  { token: 'label-md', spec: '12/16 · 600 · 0.02em', className: 'text-label-md' },
  { token: 'label-sm', spec: '11/14 · 700 · 0.04em', className: 'text-label-sm uppercase' },
];

const spacing = [
  { token: 'space-xs', px: 4, className: 'w-space-xs' },
  { token: 'space-sm', px: 8, className: 'w-space-sm' },
  { token: 'space-md', px: 16, className: 'w-space-md' },
  { token: 'space-lg', px: 24, className: 'w-space-lg' },
  { token: 'margin', px: 32, className: 'w-margin' },
  { token: 'space-xl', px: 40, className: 'w-space-xl' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-border py-10">
      <h2 id={`${id}-title`} className="mb-6 text-headline-md text-navy">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-label-md text-muted">{children}</p>;
}

const nav = ['colours', 'type', 'shape', 'buttons', 'forms', 'badges', 'cards', 'feedback', 'overlays'];

export default function StyleguidePage() {
  // Design reference only: available in `next dev`, 404s in any built app
  // (so it never ships on Vercel, preview or production).
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 bg-navy text-white shadow-overlay">
        <div className="mx-auto flex max-w-page items-center gap-6 overflow-x-auto px-4 py-3 md:px-6">
          <span className="shrink-0 text-headline-sm">Styleguide</span>
          <nav aria-label="Sections" className="flex gap-4">
            {nav.map((n) => (
              <a key={n} href={`#${n}`} className="shrink-0 text-label-md capitalize opacity-80 hover:opacity-100">
                {n}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-page px-4 pb-24 md:px-6">
        <div className="py-10">
          <p className="mb-2 text-label-sm text-action uppercase">Phase 1 · temporary</p>
          <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">Design tokens & UI primitives</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-muted">
            Everything below is rendered from the Tailwind theme in <code>app/globals.css</code> and the primitives in{' '}
            <code>components/ui</code>. Resize the window (or open on a phone) to check mobile, tablet (768px) and
            desktop (1200px).
          </p>
        </div>

        <Section id="colours" title="Colours">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {colours.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-card border border-border bg-card">
                <div className={`h-16 border-b border-border ${c.swatch}`} />
                <div className="p-3">
                  <p className="text-label-lg text-navy">{c.name}</p>
                  <p className="text-body-sm text-muted">{c.hex}</p>
                  <p className="mt-1 text-body-sm text-chip-ink">{c.use}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typography · Montserrat">
          <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {typeScale.map((t) => (
              <div key={t.token} className="flex flex-col gap-1 p-4 md:flex-row md:items-baseline md:gap-6">
                <div className="w-48 shrink-0">
                  <p className="text-label-md text-navy">{t.token}</p>
                  <p className="text-body-sm text-muted">{t.spec}</p>
                </div>
                <p className={`${t.className} text-navy`}>Pre-owned cars in Hyderabad</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Label>Responsive heading (mobile size below 768px)</Label>
            <p className="text-headline-lg-mobile text-navy md:text-headline-lg">Find your next car</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-8">
            <div>
              <Label>formatPriceLakh (cards)</Label>
              <p className="text-headline-sm font-bold text-navy">
                {formatPriceLakh(450000)} · {formatPriceLakh(1525000)} · {formatPriceLakh(12000000)}
              </p>
            </div>
            <div>
              <Label>formatPriceFull (detail page)</Label>
              <p className="text-headline-sm font-bold text-navy">{formatPriceFull(1525000)}</p>
            </div>
            <div>
              <Label>formatKm</Label>
              <p className="text-headline-sm font-semibold text-navy">
                {formatKm(32000)} · {formatKm(100000)}
              </p>
            </div>
          </div>
        </Section>

        <Section id="shape" title="Radius, elevation & spacing">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Label>Radius</Label>
              <div className="flex items-end gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="size-20 rounded-card border border-border bg-card" />
                  <span className="text-body-sm">card 16px</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-14 rounded-control border border-border bg-card" />
                  <span className="text-body-sm">control 8px</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-16 rounded-full border border-border bg-card" />
                  <span className="text-body-sm">full</span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Elevation</Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex h-24 items-center justify-center rounded-card bg-canvas text-body-sm ring-1 ring-border ring-inset">
                  Level 0
                </div>
                <div className="flex h-24 items-center justify-center rounded-card border border-border bg-card text-body-sm shadow-level-1">
                  Level 1 · card
                </div>
                <div className="flex h-24 items-center justify-center rounded-card border border-tint bg-card text-body-sm shadow-level-2">
                  Level 2 · hover
                </div>
                <div className="flex h-24 items-center justify-center rounded-card bg-card text-body-sm shadow-level-3">
                  Level 3 · overlay
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <Label>Spacing (4px base: p-1 = 4px, p-4 = 16px, gap-6 = 24px)</Label>
            <div className="flex flex-col gap-2">
              {spacing.map((s) => (
                <div key={s.token} className="flex items-center gap-3">
                  <div className={`h-4 rounded-sm bg-highlight ${s.className}`} />
                  <span className="text-body-sm">
                    {s.token} · {s.px}px
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="buttons" title="Buttons">
          <div className="flex flex-col gap-6">
            {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
              <div key={variant}>
                <Label>{variant}</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={variant} size="sm">
                    Small
                  </Button>
                  <Button variant={variant}>Medium</Button>
                  <Button variant={variant} size="lg">
                    Large
                  </Button>
                  <Button variant={variant} loading>
                    Loading
                  </Button>
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                </div>
              </div>
            ))}
            <div>
              <Label>Interactive loading · link styled as button · full width (mobile CTA)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <LoadingButtonDemo />
                <a href="#buttons" className={buttonStyles({ variant: 'secondary' })}>
                  Link as button
                </a>
              </div>
              <div className="mt-3 max-w-sm">
                <Button fullWidth size="lg">
                  Enquire about this car
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section id="forms" title="Form controls">
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Full name" placeholder="Your name" autoComplete="name" required />
            <Input
              label="Phone"
              type="tel"
              placeholder="10-digit mobile number"
              hint="We only use this to call you back."
            />
            <Input label="Email" type="email" defaultValue="not-an-email" error="Enter a valid email address." />
            <Input label="Disabled" defaultValue="Read only value" disabled />
            <Select
              label="Brand"
              placeholder="Any brand"
              options={[
                { value: 'bmw', label: 'BMW' },
                { value: 'hyundai', label: 'Hyundai' },
                { value: 'maruti-suzuki', label: 'Maruti Suzuki' },
              ]}
            />
            <Select
              label="Body type"
              error="Choose a body type."
              options={[
                { value: 'suv', label: 'SUV' },
                { value: 'sedan', label: 'Sedan' },
              ]}
            />
            <Textarea label="Message" placeholder="Anything you'd like to know about this car?" />
            <div>
              <Label>Checkboxes</Label>
              <Checkbox label="Petrol" meta={12} defaultChecked />
              <Checkbox label="Diesel" meta={7} />
              <Checkbox label="Electric" meta={0} disabled />
            </div>
          </div>
          <div className="mt-6 max-w-md">
            <Label>Search field (focus it to see the ring)</Label>
            <div className="relative">
              <SearchIcon
                width={18}
                height={18}
                className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted"
              />
              <Input label="Search cars" hideLabel placeholder="Search brand or model" className="pl-10" />
            </div>
          </div>
        </Section>

        <Section id="badges" title="Badges & chips">
          <div className="flex flex-col gap-6">
            <div>
              <Label>Tones</Label>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">Neutral</Badge>
                <Badge tone="green">Green</Badge>
                <Badge tone="amber">Amber</Badge>
                <Badge tone="blue">Blue</Badge>
              </div>
            </div>
            <div>
              <Label>The four allowed data-driven badges (CLAUDE.md §4)</Label>
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue" dot>
                  New Arrival
                </Badge>
                <Badge tone="neutral" dot>
                  Featured
                </Badge>
                <Badge tone="green" dot>
                  1st Owner
                </Badge>
                <Badge tone="amber" dot>
                  Reserved
                </Badge>
              </div>
            </div>
            <div>
              <Label>Spec pills</Label>
              <div className="flex flex-wrap gap-2">
                <Badge size="spec">2023</Badge>
                <Badge size="spec">{formatKm(28000)}</Badge>
                <Badge size="spec">Petrol</Badge>
                <Badge size="spec">Automatic</Badge>
              </div>
            </div>
            <ChipDemo />
          </div>
        </Section>

        <Section id="cards" title="Cards">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <h3 className="text-headline-sm text-navy">Static card</h3>
              <p className="mt-1 text-body-md text-muted">Level 1, 16px radius, 16px padding.</p>
            </Card>
            <Card interactive tabIndex={0}>
              <h3 className="text-headline-sm text-navy">Interactive card</h3>
              <p className="mt-1 text-body-md text-muted">Hover or focus: level 2 shadow and tinted border.</p>
            </Card>
            <Card interactive padding="none" className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-chip">
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge tone="blue">New Arrival</Badge>
                  <Badge tone="green">1st Owner</Badge>
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-body-sm text-muted">
                  Car photo (16:10)
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <h3 className="text-headline-sm text-navy">2023 BMW X1 sDrive18i</h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge size="spec">{formatKm(28000)}</Badge>
                  <Badge size="spec">Petrol</Badge>
                  <Badge size="spec">Automatic</Badge>
                </div>
                <p className="text-headline-md text-navy">{formatPriceLakh(4200000)}</p>
              </div>
            </Card>
          </div>
        </Section>

        <Section id="feedback" title="Loading, empty & toast">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card padding="none" className="overflow-hidden" aria-busy="true" aria-label="Loading car">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="flex flex-col gap-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                <Skeleton className="h-7 w-28" />
              </div>
            </Card>
            <EmptyState
              className="lg:col-span-2"
              icon={<SearchIcon width={22} height={22} />}
              title="No cars match these filters"
              description="Try removing a filter or widening your budget."
              action={<Button variant="ghost">Clear all filters</Button>}
            />
          </div>
          <div className="mt-6">
            <Label>Toasts (bottom centre on mobile, bottom right from 768px)</Label>
            <ToastDemo />
          </div>
        </Section>

        <Section id="overlays" title="Modal & bottom sheet">
          <div className="flex flex-wrap gap-3">
            <ModalDemo />
            <BottomSheetDemo />
          </div>
          <p className="mt-3 text-body-sm text-muted">
            Both use the native &lt;dialog&gt;: focus is trapped, Escape and backdrop click close, focus returns to the
            trigger.
          </p>
        </Section>
      </main>
    </div>
  );
}

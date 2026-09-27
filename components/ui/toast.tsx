'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from './icons';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Default 5000; errors default to 8000. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number; tone: ToastTone };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const tones: Record<ToastTone, { icon: typeof CheckIcon; iconClass: string }> = {
  success: { icon: CheckIcon, iconClass: 'bg-trust-soft text-trust-ink' },
  error: { icon: AlertIcon, iconClass: 'bg-danger-soft text-danger' },
  info: { icon: InfoIcon, iconClass: 'bg-action-soft text-action-ink' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    // Keep at most 3 on screen.
    setItems((current) => [...current.slice(-2), { ...input, id, tone: input.tone ?? 'info' }]);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Top on phones so toasts never cover sticky bottom bars (save bar, call/WhatsApp bar). */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:top-auto md:bottom-0 md:items-end md:pt-4">
        {/* Separate live regions so errors interrupt and everything else waits politely. */}
        <div role="status" aria-live="polite" className="flex w-full flex-col items-center gap-2 md:items-end">
          {items
            .filter((t) => t.tone !== 'error')
            .map((t) => (
              <ToastView key={t.id} item={t} onDismiss={dismiss} />
            ))}
        </div>
        <div role="alert" aria-live="assertive" className="flex w-full flex-col items-center gap-2 md:items-end">
          {items
            .filter((t) => t.tone === 'error')
            .map((t) => (
              <ToastView key={t.id} item={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const { icon: Icon, iconClass } = tones[item.tone];
  const duration = item.duration ?? (item.tone === 'error' ? 8000 : 5000);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(item.id), duration);
    return () => window.clearTimeout(timer);
  }, [paused, duration, item.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border border-border bg-card p-4 shadow-overlay',
        'transition-[opacity,translate] duration-200 motion-reduce:transition-none starting:-translate-y-2 starting:opacity-0 md:starting:translate-y-2',
      )}
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconClass)}>
        <Icon width={18} height={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <p className="text-label-lg text-navy">{item.title}</p>
        {item.description && <p className="text-body-sm text-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted focus-ring hover:bg-chip hover:text-navy"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}

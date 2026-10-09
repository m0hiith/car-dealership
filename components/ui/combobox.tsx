'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { controlStyles, describedBy, Field, type FieldProps } from './field';
import { ChevronDownIcon, PlusIcon, Spinner } from './icons';

export type ComboboxOption = { value: string; label: string };

export type ComboboxProps = FieldProps & {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shown when nothing matches (and no create option applies). */
  emptyText?: string;
  /** Offers "Add “{query}”" when the typed text matches no option exactly. */
  onCreate?: (query: string) => void;
  /** Shows a spinner on the create option while it runs. */
  creating?: boolean;
  createLabel?: (query: string) => string;
};

/** Letters and digits only, so "wagonr" finds "Wagon R" and "i 20" finds "i20". */
function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Searchable single select (ARIA combobox with a listbox popup). Type to
 * filter, arrow keys to move, Enter to pick, Escape to close.
 */
export function Combobox({
  id,
  label,
  hint,
  error,
  hideLabel,
  required,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  emptyText = 'No matches',
  onCreate,
  creating = false,
  createLabel = (q) => `Add “${q}”`,
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = normalise(query);
    if (!q) return options;
    const starts = options.filter((o) => normalise(o.label).startsWith(q));
    const contains = options.filter((o) => !normalise(o.label).startsWith(q) && normalise(o.label).includes(q));
    return [...starts, ...contains];
  }, [options, query]);

  const trimmed = query.trim().replace(/\s+/g, ' ');
  const canCreate =
    Boolean(onCreate) && trimmed.length > 0 && !options.some((o) => normalise(o.label) === normalise(trimmed));
  const items: Array<{ kind: 'option'; option: ComboboxOption } | { kind: 'create' }> = [
    ...filtered.map((option) => ({ kind: 'option' as const, option })),
    ...(canCreate ? [{ kind: 'create' as const }] : []),
  ];

  function openList() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    const index = options.findIndex((o) => o.value === value);
    setActive(Math.max(0, index));
    requestAnimationFrame(() => scrollActiveIntoView(Math.max(0, index)));
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    if (item.kind === 'create') {
      onCreate?.(trimmed);
    } else {
      onChange(item.option.value);
    }
    close();
  }

  function scrollActiveIntoView(index: number) {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  function move(delta: number) {
    if (items.length === 0) return;
    const next = (active + delta + items.length) % items.length;
    setActive(next);
    scrollActiveIntoView(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) move(-1);
        break;
      case 'Enter':
        if (open) {
          e.preventDefault();
          choose(active);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  }

  const activeId = open && items[active] ? `${inputId}-opt-${active}` : undefined;

  return (
    <Field id={inputId} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          aria-required={required || undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          // While searching, the current choice stays visible as the placeholder.
          placeholder={open && selected ? selected.label : placeholder}
          value={open ? query : (selected?.label ?? '')}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={openList}
          onClick={() => !open && openList()}
          onBlur={close}
          onKeyDown={onKeyDown}
          className={cn(controlStyles, 'h-11 pr-10 pl-3', open && selected && 'placeholder:text-chip-ink')}
        />
        <ChevronDownIcon
          width={18}
          height={18}
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted transition-transform',
            open && 'rotate-180',
          )}
        />
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={typeof label === 'string' ? label : undefined}
            // Keep focus in the input while tapping an option.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-control border border-border bg-card py-1 shadow-overlay"
          >
            {items.length === 0 && <li className="px-3 py-2.5 text-body-md text-muted">{emptyText}</li>}
            {items.map((item, index) => {
              const isActive = index === active;
              if (item.kind === 'create') {
                return (
                  <li
                    key="__create"
                    id={`${inputId}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(index)}
                    onMouseMove={() => setActive(index)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2 border-t border-border px-3 text-label-lg text-action-ink',
                      isActive && 'bg-action-soft',
                    )}
                  >
                    {creating ? <Spinner width={16} height={16} /> : <PlusIcon width={16} height={16} />}
                    {createLabel(trimmed)}
                  </li>
                );
              }
              const isSelected = item.option.value === value;
              return (
                <li
                  key={item.option.value}
                  id={`${inputId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => choose(index)}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center px-3 text-body-lg text-navy',
                    isActive && 'bg-chip',
                    isSelected && 'font-semibold text-action-ink',
                  )}
                >
                  {item.option.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Field>
  );
}

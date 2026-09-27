'use client';

import type { KeyboardEvent } from 'react';

export type RangeValue = [number, number];

export type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: RangeValue;
  /** Every movement, for live labels. */
  onChange: (value: RangeValue) => void;
  /** When the user lets go (pointer up, or a key press), to apply the value. */
  onCommit: (value: RangeValue) => void;
  /** Accessible names for the two thumbs. */
  labels: [string, string];
  /** Spoken value, e.g. "₹5 Lakh". */
  formatValue?: (n: number) => string;
};

const COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

/** Two-thumb slider built on native range inputs (keyboard and screen reader support included). */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  labels,
  formatValue = String,
}: RangeSliderProps) {
  const [lo, hi] = value;
  const span = max - min || 1;
  const left = ((lo - min) / span) * 100;
  const right = 100 - ((hi - min) / span) * 100;

  function set(which: 0 | 1, n: number): RangeValue {
    return which === 0 ? [Math.min(n, hi), hi] : [lo, Math.max(n, lo)];
  }

  function thumb(which: 0 | 1) {
    const current = value[which];
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        aria-label={labels[which]}
        aria-valuetext={formatValue(current)}
        onChange={(e) => onChange(set(which, Number(e.target.value)))}
        onPointerUp={(e) => onCommit(set(which, Number(e.currentTarget.value)))}
        onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
          if (COMMIT_KEYS.has(e.key)) onCommit(set(which, Number(e.currentTarget.value)));
        }}
        // Keep the upper thumb reachable when both sit at the minimum.
        className="range-thumb"
        style={{ zIndex: which === 0 && lo >= max - step ? 2 : which === 1 ? 1 : 0 }}
      />
    );
  }

  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" aria-hidden />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-highlight"
        style={{ left: `${left}%`, right: `${right}%` }}
        aria-hidden
      />
      {thumb(0)}
      {thumb(1)}
    </div>
  );
}

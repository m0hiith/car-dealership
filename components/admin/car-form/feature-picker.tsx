'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button, Checkbox, Chip, Input, Select } from '@/components/ui';
import { PlusIcon } from '@/components/ui/icons';
import { AIRBAG_COUNTS, airbagsFeature, COMMON_FEATURES, parseAirbagsFeature } from '@/lib/car-options';
import { MAX_FEATURES } from '@/lib/validation/car';

const common = new Set<string>(COMMON_FEATURES);
const commonByKey = new Map(COMMON_FEATURES.map((f) => [f.toLowerCase(), f]));

/**
 * Features are stored as plain names. This splits them into the common
 * checkbox grid, an airbag count ("6 Airbags") and free-text extras.
 */
export function FeaturePicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (features: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string>();

  const selected = new Set(value.map((f) => f.toLowerCase()));
  const airbags = value.map(parseAirbagsFeature).find((n) => n !== null) ?? null;
  const custom = value.filter((f) => !common.has(f) && parseAirbagsFeature(f) === null);

  function toggle(feature: string, on: boolean) {
    onChange(on ? [...value, feature] : value.filter((f) => f !== feature));
  }

  function setAirbags(count: number | null) {
    const rest = value.filter((f) => parseAirbagsFeature(f) === null);
    onChange(count === null ? rest : [...rest, airbagsFeature(count)]);
  }

  function addCustom() {
    const name = draft.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (name.length > 60) return setDraftError('Keep each feature under 60 characters.');
    if (value.length >= MAX_FEATURES) return setDraftError(`You can add up to ${MAX_FEATURES} features.`);
    const match = commonByKey.get(name.toLowerCase());
    if (!selected.has(name.toLowerCase())) onChange([...value, match ?? name]);
    setDraft('');
    setDraftError(undefined);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-label-lg text-navy">Common features</legend>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMMON_FEATURES.map((feature) => (
            <Checkbox
              key={feature}
              label={feature}
              checked={value.includes(feature)}
              onChange={(e) => toggle(feature, e.target.checked)}
            />
          ))}
        </div>
      </fieldset>

      <div className="max-w-xs">
        <Select
          label="Airbags"
          value={airbags === null ? '' : String(airbags)}
          onChange={(e) => setAirbags(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="Not specified"
          options={AIRBAG_COUNTS.map((n) => ({ value: String(n), label: airbagsFeature(n) }))}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                id="car-custom-feature"
                label="Other feature"
                placeholder="e.g. Ambient Lighting"
                value={draft}
                maxLength={60}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setDraftError(undefined);
                }}
                onKeyDown={onKeyDown}
                aria-invalid={draftError ? true : undefined}
                aria-describedby={draftError ? 'car-custom-feature-msg' : undefined}
                enterKeyHint="done"
              />
            </div>
            <Button variant="ghost" onClick={addCustom} disabled={!draft.trim()}>
              <PlusIcon width={18} height={18} />
              Add
            </Button>
          </div>
          {draftError && (
            <p id="car-custom-feature-msg" className="text-body-sm font-medium text-danger">
              {draftError}
            </p>
          )}
        </div>
        {custom.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Other features">
            {custom.map((feature) => (
              <li key={feature}>
                <Chip onRemove={() => toggle(feature, false)} aria-label={`Remove ${feature}`}>
                  {feature}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-body-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

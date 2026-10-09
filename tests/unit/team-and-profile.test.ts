import { describe, expect, it } from 'vitest';
import { isSiteMediaPath } from '@/lib/site-media';
import { teamMemberSchema } from '@/lib/validation/content';
import { leadSchema } from '@/lib/validation/lead';

describe('teamMemberSchema', () => {
  const base = { name: 'Ravi Kumar', role: '', bio: '', yearsExperience: '', photo: 'keep', isVisible: true } as const;

  it('accepts a name alone, with empty extras as null', () => {
    const parsed = teamMemberSchema.parse(base);
    expect(parsed).toMatchObject({ name: 'Ravi Kumar', role: null, bio: null, yearsExperience: null });
  });

  it('reads years of experience as a whole number', () => {
    expect(teamMemberSchema.parse({ ...base, yearsExperience: '15' }).yearsExperience).toBe(15);
  });

  it.each([
    ['no name', { name: '  ' }],
    ['years as text', { yearsExperience: 'fifteen' }],
    ['years with decimals', { yearsExperience: '1.5' }],
    ['a long bio', { bio: 'x'.repeat(501) }],
    ['a photo from another folder', { photo: { path: 'logo/3f2504e0-4f89-41d3-9a0c-0305e82c3301.webp' } }],
  ])('rejects %s', (_name, change) => {
    expect(teamMemberSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });

  it('accepts a team photo uploaded to site-media', () => {
    const path = 'team/3f2504e0-4f89-41d3-9a0c-0305e82c3301.webp';
    expect(isSiteMediaPath(path, 'team')).toBe(true);
    expect(teamMemberSchema.safeParse({ ...base, photo: { path } }).success).toBe(true);
  });
});

describe('lead profile answers', () => {
  const base = { name: 'Ravi', phone: '9876543210' };

  it('are all optional', () => {
    const parsed = leadSchema.parse({ ...base, city: '', budgetRange: '', bodyType: '', timeline: '', exchange: '' });
    expect(parsed).toMatchObject({
      city: undefined,
      budgetRange: undefined,
      bodyType: undefined,
      timeline: undefined,
      exchange: undefined,
    });
  });

  it('keep known choices and turn the exchange answer into a boolean', () => {
    const parsed = leadSchema.parse({
      ...base,
      city: ' Secunderabad ',
      budgetRange: '5_10l',
      bodyType: 'suv',
      timeline: 'this_month',
      exchange: 'no',
    });
    expect(parsed).toMatchObject({
      city: 'Secunderabad',
      budgetRange: '5_10l',
      bodyType: 'suv',
      timeline: 'this_month',
      exchange: false,
    });
    expect(leadSchema.parse({ ...base, exchange: 'yes' }).exchange).toBe(true);
  });

  it.each([
    ['budgetRange', '1 crore'],
    ['bodyType', 'tractor'],
    ['timeline', 'someday'],
    ['exchange', 'maybe'],
  ])('reject an unknown %s', (field, value) => {
    expect(leadSchema.safeParse({ ...base, [field]: value }).success).toBe(false);
  });
});

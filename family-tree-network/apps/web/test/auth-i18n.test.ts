import { describe, expect, it } from 'vitest';
import { ALL_COUNTRIES, AUTH_DICTS, PRIORITY_COUNTRIES, fill, passwordStrength } from '../lib/i18n-auth';

describe('account texts', () => {
  it('every language defines every account text', () => {
    const keys = Object.keys(AUTH_DICTS.en).sort();
    for (const l of ['de', 'ar', 'ku'] as const) {
      expect(Object.keys(AUTH_DICTS[l]).sort()).toEqual(keys);
      for (const k of keys) expect(AUTH_DICTS[l][k as keyof typeof AUTH_DICTS.en], `${l}.${k}`).toBeTruthy();
    }
  });

  it('placeholders are kept in every translation', () => {
    for (const k of ['stepOf', 'tooMany', 'verifyBanner'] as const) {
      const ph = AUTH_DICTS.en[k].match(/\{\w+\}/g);
      for (const l of ['de', 'ar', 'ku'] as const) expect(AUTH_DICTS[l][k].match(/\{\w+\}/g), `${l}.${k}`).toEqual(ph);
    }
    expect(fill('Step {n} of 3', { n: 2 })).toBe('Step 2 of 3');
  });
});

describe('password strength guide', () => {
  it('grades length and variety', () => {
    expect(passwordStrength('short')).toBe(0);
    expect(passwordStrength('abcdefghij')).toBe(1);
    expect(passwordStrength('abcdefghij12')).toBe(2);
    expect(passwordStrength('river stone garden')).toBe(3);
  });
});

describe('countries', () => {
  it('priority countries are valid ISO codes and the list has no duplicates', () => {
    for (const c of PRIORITY_COUNTRIES) expect(ALL_COUNTRIES).toContain(c);
    expect(new Set(ALL_COUNTRIES).size).toBe(ALL_COUNTRIES.length);
    expect(ALL_COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
  });
});

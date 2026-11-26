import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LanguageSwitch from '../components/LanguageSwitch';
import { DICTS, I18nProvider, dirOf, useI18n } from '../lib/i18n';

function Probe() {
  const { t, dir } = useI18n();
  return (
    <p data-testid="probe" data-dir={dir}>
      {t.howConnected}
    </p>
  );
}

describe('i18n', () => {
  it('every language defines every key (no missing translations)', () => {
    const keys = Object.keys(DICTS.en).sort();
    expect(Object.keys(DICTS.de).sort()).toEqual(keys);
    expect(Object.keys(DICTS.ar).sort()).toEqual(keys);
    expect(Object.keys(DICTS.ku).sort()).toEqual(keys);
    for (const l of ['en', 'de', 'ar', 'ku'] as const) for (const k of keys) expect(DICTS[l][k as keyof typeof DICTS.en], `${l}.${k}`).toBeTruthy();
  });

  it('Arabic is RTL, German and English are LTR', () => {
    expect(dirOf('ar')).toBe('rtl');
    expect(dirOf('de')).toBe('ltr');
    expect(dirOf('en')).toBe('ltr');
    expect(dirOf('ku')).toBe('ltr'); // Kurmanji in Latin (Hawar) script
  });

  it('switching language updates text and the document direction', async () => {
    render(
      <I18nProvider initial="ar">
        <LanguageSwitch />
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('كيف نحن مرتبطون؟');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    await act(async () => screen.getByTestId('lang-de').click());
    expect(screen.getByTestId('probe').textContent).toBe('Wie sind wir verbunden?');
    expect(document.documentElement.dir).toBe('ltr');
    await act(async () => screen.getByTestId('lang-en').click());
    expect(screen.getByTestId('probe').getAttribute('data-dir')).toBe('ltr');
  });
});

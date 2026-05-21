import en from './en';
import de from './de';
import fr from './fr';

export type TranslationKey = keyof typeof en;
type Translations = Record<string, Record<TranslationKey, string>>;

const translations: Translations = { en, de, fr };

export function t(
  key: TranslationKey,
  lang: string = 'en',
  vars?: Record<string, string>,
): string {
  const dict = translations[lang] ?? translations.en;
  let text = dict[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}

/**
 * Returns the 8 instant UNO trigger words translated to the given language.
 */
export function getInstantUnoWords(lang: string = 'en'): string[] {
  return Array.from({ length: 8 }, (_, i) => t(`uno_word_${i}` as TranslationKey, lang));
}

export function getAvailableLanguages(): { code: string; label: string }[] {
  return [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
  ];
}

export default translations;

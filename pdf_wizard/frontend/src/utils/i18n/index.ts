import type { Language } from './types';

export { lookupTranslation, getTranslationsFor } from './catalog';
export { I18nProvider, useI18n, type I18nContextValue } from './I18nProvider';

// getNativeLanguageName returns the native name of a language
// This is used in language selectors to show the language in its own name
export const getNativeLanguageName = (lang: Language): string => {
  const nativeNames: Record<Language, string> = {
    en: 'English',
    zh: '简体中文',
    'zh-TW': '繁體中文',
    ar: 'العربية',
    fr: 'Français',
    ja: '日本語',
    hi: 'हिन्दी',
    es: 'Español',
    pt: 'Português',
    ru: 'Русский',
    ko: '한국어',
    de: 'Deutsch',
  };
  return nativeNames[lang] || lang;
};

export type { Language, Translations } from './types';

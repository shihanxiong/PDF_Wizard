import { Language, Translations } from './types';
import { en } from './en';
import { zh } from './zh';
import { ar } from './ar';
import { fr } from './fr';
import { ja } from './ja';
import { hi } from './hi';
import { es } from './es';
import { pt } from './pt';
import { ru } from './ru';

const translations: Record<Language, Translations> = {
  en,
  zh,
  ar,
  fr,
  ja,
  hi,
  es,
  pt,
  ru,
};

let currentLanguage: Language = 'en';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

export const getLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: keyof Translations): string => {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
};

export const getTranslations = (): Translations => {
  return translations[currentLanguage] || translations.en;
};

// getNativeLanguageName returns the native name of a language
// This is used in language selectors to show the language in its own name
export const getNativeLanguageName = (lang: Language): string => {
  const nativeNames: Record<Language, string> = {
    en: 'English',
    zh: '简体中文',
    ar: 'العربية',
    fr: 'Français',
    ja: '日本語',
    hi: 'हिन्दी',
    es: 'Español',
    pt: 'Português',
    ru: 'Русский',
  };
  return nativeNames[lang] || lang;
};

// Re-export types for convenience
export type { Language, Translations };

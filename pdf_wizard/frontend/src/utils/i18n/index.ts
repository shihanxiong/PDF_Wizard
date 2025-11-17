import { Language, Translations } from './types';
import { en } from './en';
import { zh } from './zh';

const translations: Record<Language, Translations> = {
  en,
  zh,
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

// Re-export types for convenience
export type { Language, Translations };

import type { Translations } from './types';
import { en } from './en';
import { zh } from './zh';
import { zhTW } from './zh-TW';
import { ar } from './ar';
import { fr } from './fr';
import { ja } from './ja';
import { hi } from './hi';
import { es } from './es';
import { pt } from './pt';
import { ru } from './ru';
import { ko } from './ko';
import { de } from './de';

const translations = {
  en,
  zh,
  'zh-TW': zhTW,
  ar,
  fr,
  ja,
  hi,
  es,
  pt,
  ru,
  ko,
  de,
} satisfies Record<string, Translations>;

export type Language = keyof typeof translations;

/** Locale codes that have a translations module in catalog.ts */
export function listCatalogLanguages(): Language[] {
  return Object.keys(translations) as Language[];
}

export function lookupTranslation(lang: Language, key: keyof Translations): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function getTranslationsFor(lang: Language): Translations {
  return translations[lang] || translations.en;
}

import supportedLanguagesConfig from '@supported-languages';
import { listCatalogLanguages, type Language } from './catalog';

function validateSupportedLanguagesConfig() {
  const catalogCodes = listCatalogLanguages();
  for (const code of supportedLanguagesConfig.languages) {
    if (!catalogCodes.includes(code as Language)) {
      throw new Error(`supported-languages.json lists unknown locale: ${code}`);
    }
  }
  for (const code of catalogCodes) {
    if (!supportedLanguagesConfig.languages.includes(code)) {
      throw new Error(`supported-languages.json is missing locale: ${code}`);
    }
  }
}

validateSupportedLanguagesConfig();

/** UI order matches pdf_wizard/i18n/supported-languages.json */
export const SUPPORTED_LANGUAGES = supportedLanguagesConfig.languages as readonly Language[];

export const DEFAULT_LANGUAGE = supportedLanguagesConfig.default as Language;

/**
 * Checks if a language code is valid/supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

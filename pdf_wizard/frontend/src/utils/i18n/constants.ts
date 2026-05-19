import type { Language } from './types';
import { SUPPORTED_LANGUAGES } from './languages.gen';

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './languages.gen';

/**
 * Checks if a language code is valid/supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

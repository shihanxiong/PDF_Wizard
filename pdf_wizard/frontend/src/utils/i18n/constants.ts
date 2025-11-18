import { Language } from './types';

/**
 * List of all supported languages in the application.
 * This is the single source of truth for language validation.
 */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  'en',
  'zh',
  'zh-TW',
  'ar',
  'fr',
  'ja',
  'hi',
  'es',
  'pt',
  'ru',
  'ko',
  'de',
] as const;

/**
 * Checks if a language code is valid/supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}


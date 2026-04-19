import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { lookupTranslation, getTranslationsFor } from './catalog';
import type { Language, Translations } from './types';

export type I18nContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
  getTranslations: () => Translations;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: keyof Translations) => lookupTranslation(language, key),
    [language]
  );

  const getTranslations = useCallback(() => getTranslationsFor(language), [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      getTranslations,
    }),
    [language, setLanguage, t, getTranslations]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

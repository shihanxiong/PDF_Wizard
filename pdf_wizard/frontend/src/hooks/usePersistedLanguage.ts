import { useState, useEffect, useCallback } from 'react';
import { GetLanguage, SetLanguage } from '../../wailsjs/go/main/App';
import { useI18n, type Language } from '../utils/i18n';
import { isValidLanguage } from '../utils/i18n/constants';
import { getErrorMessage } from '../utils/errors';

/**
 * Hook that owns the persisted language lifecycle:
 * loads from the Go backend on mount, validates, and exposes
 * a saveLanguage helper that persists to backend + updates i18n context.
 */
export function usePersistedLanguage() {
  const { setLanguage, language } = useI18n();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const lang = await GetLanguage();
        const validated: Language = isValidLanguage(lang) ? lang : 'en';
        setLanguage(validated);
      } catch (err) {
        console.error('Failed to load language:', getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLanguage = useCallback(
    async (lang: Language) => {
      await SetLanguage(lang);
      setLanguage(lang);
    },
    [setLanguage],
  );

  return { language, saveLanguage, isLoading };
}

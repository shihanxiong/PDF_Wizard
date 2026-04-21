import { useState, useCallback } from 'react';
import { useI18n, type Translations } from '../utils/i18n';
import { getErrorMessage } from '../utils/errors';

/**
 * Hook for consistent error handling across components
 */
export function useErrorHandler() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, errorKey: keyof Translations) => {
      setError(`${t(errorKey)} ${getErrorMessage(err)}`);
    },
    [t]
  );

  return { error, setError, handleError };
}


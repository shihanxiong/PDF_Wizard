import { useState, useCallback } from 'react';
import { useI18n, type Translations } from '../utils/i18n';

/**
 * Hook for consistent error handling across components
 */
export function useErrorHandler() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, errorKey: keyof Translations) => {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : err?.toString() || 'Unknown error occurred';
      setError(`${t(errorKey)} ${errorMessage}`);
    },
    [t]
  );

  return { error, setError, handleError };
}


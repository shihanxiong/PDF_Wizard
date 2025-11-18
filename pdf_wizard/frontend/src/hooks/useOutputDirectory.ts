import { useState, useCallback } from 'react';
import { SelectOutputDirectory } from '../../wailsjs/go/main/App';
import { useErrorHandler } from './useErrorHandler';
import { type Translations } from '../utils/i18n';

/**
 * Hook for managing output directory selection with consistent error handling
 */
export function useOutputDirectory(errorKey: keyof Translations) {
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const { handleError, setError } = useErrorHandler();

  const selectDirectory = useCallback(async () => {
    try {
      const dir = await SelectOutputDirectory();
      if (dir) {
        setOutputDirectory(dir);
        setError(null);
      }
    } catch (err) {
      handleError(err, errorKey);
    }
  }, [errorKey, handleError, setError]);

  return {
    outputDirectory,
    setOutputDirectory,
    selectDirectory,
  };
}


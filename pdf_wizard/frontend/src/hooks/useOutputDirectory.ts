import { useState, useCallback } from 'react';
import { SelectOutputDirectory } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import { useErrorHandler } from './useErrorHandler';
import { useI18n } from '../utils/i18n';
import { type Translations } from '../utils/i18n';

/**
 * Hook for managing output directory selection with consistent error handling
 */
export function useOutputDirectory(errorKey: keyof Translations, dialogTitleKey: keyof Translations) {
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const { handleError, setError } = useErrorHandler();
  const { t } = useI18n();

  const selectDirectory = useCallback(async () => {
    try {
      const dir = await SelectOutputDirectory(
        new models.FileDialogLabels({ title: t(dialogTitleKey), filterDisplayName: '' }),
      );
      if (dir) {
        setOutputDirectory(dir);
        setError(null);
      }
    } catch (err: unknown) {
      handleError(err, errorKey);
    }
  }, [dialogTitleKey, errorKey, handleError, setError, t]);

  return {
    outputDirectory,
    setOutputDirectory,
    selectDirectory,
  };
}


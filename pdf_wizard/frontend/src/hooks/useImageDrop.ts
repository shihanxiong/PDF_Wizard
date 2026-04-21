import { useCallback } from 'react';
import { GetFileMetadata } from '../../wailsjs/go/main/App';
import { useI18n } from '../utils/i18n';
import { convertToSelectedFile } from '../utils/formatters';
import { SelectedFile } from '../types';
import { getErrorMessage } from '../utils/errors';

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.tif',
  '.tiff',
  '.bmp',
  '.heic',
  '.heif',
];

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Hook for handling image file drops (merge order via caller).
 */
export function useImageDrop() {
  const { t } = useI18n();
  const handleImageDrop = useCallback(
    async (
      paths: string[],
      options: {
        onSuccess: (files: SelectedFile[]) => void;
        onError: (error: string) => void;
      }
    ) => {
      const { onSuccess, onError } = options;
      const imagePaths = paths.filter(isImagePath);

      if (imagePaths.length === 0) {
        onError(t('noImageFilesFound'));
        return;
      }

      try {
        const metadataPromises = imagePaths.map((path) => GetFileMetadata(path));
        const metadataResults = await Promise.all(metadataPromises);
        const files = metadataResults.map(convertToSelectedFile);
        onSuccess(files);
      } catch (err: unknown) {
        onError(getErrorMessage(err));
      }
    },
    [t]
  );

  return { handleImageDrop };
}

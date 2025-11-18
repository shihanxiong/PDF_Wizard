import { useCallback } from 'react';
import { GetFileMetadata, GetPDFMetadata } from '../../wailsjs/go/main/App';
import { t } from '../utils/i18n';
import { convertToSelectedFile } from '../utils/formatters';
import { SelectedFile, SelectedPDF } from '../types';

/**
 * Hook for handling PDF file drops with consistent validation
 */
export function usePDFDrop() {
  const handlePDFDrop = useCallback(
    async (
      paths: string[],
      options: {
        allowMultiple?: boolean;
        onSuccess: (files: SelectedFile[] | SelectedPDF) => void;
        onError: (error: string) => void;
      }
    ) => {
      const { allowMultiple = false, onSuccess, onError } = options;

      // Filter PDF files
      const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));

      if (pdfPaths.length === 0) {
        onError(t('noPDFFilesFound'));
        return;
      }

      if (!allowMultiple && pdfPaths.length > 1) {
        onError(t('pleaseDropOnlyOnePDF'));
        return;
      }

      try {
        if (allowMultiple) {
          // Multiple files - use GetFileMetadata (faster, no page count)
          const metadataPromises = pdfPaths.map((path) => GetFileMetadata(path));
          const metadataResults = await Promise.all(metadataPromises);
          const files = metadataResults.map(convertToSelectedFile);
          onSuccess(files);
        } else {
          // Single file - use GetPDFMetadata (includes page count)
          const path = pdfPaths[0];
          const metadata = await GetPDFMetadata(path);
          const pdf: SelectedPDF = {
            path: metadata.path,
            name: metadata.name,
            size: metadata.size,
            lastModified: new Date(metadata.lastModified),
            totalPages: metadata.totalPages,
          };
          onSuccess(pdf);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Unknown error occurred';
        onError(errorMessage);
      }
    },
    []
  );

  return { handlePDFDrop };
}


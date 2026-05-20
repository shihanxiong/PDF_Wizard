import { useState, useCallback, useRef, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { CancelCurrentOperation } from '../../wailsjs/go/main/App';

export interface PDFProgress {
  operation: string;
  current: number;
  total: number;
  percent: number;
}

interface UsePDFOperationReturn<TArgs extends unknown[]> {
  execute: (...args: TArgs) => Promise<void>;
  cancel: () => void;
  isProcessing: boolean;
  progress: PDFProgress | null;
  error: string | null;
}

/**
 * Wraps a PDF operation call with duplicate-submit prevention, cancellation,
 * and progress tracking via Wails "pdf-progress" events.
 */
export function usePDFOperation<TArgs extends unknown[]>(
  operation: (...args: TArgs) => Promise<void>,
): UsePDFOperationReturn<TArgs> {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<PDFProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const cleanup = EventsOn('pdf-progress', (data: PDFProgress) => {
      if (processingRef.current) {
        setProgress(data);
      }
    });
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const execute = useCallback(
    async (...args: TArgs) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);
      setProgress(null);
      setError(null);
      try {
        await operation(...args);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [operation],
  );

  const cancel = useCallback(() => {
    CancelCurrentOperation();
  }, []);

  return { execute, cancel, isProcessing, progress, error };
}

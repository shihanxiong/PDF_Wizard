import { useState, useCallback } from 'react';
import { getErrorMessage } from '../utils/errors';

export type ProcessingSetError = (error: string | null) => void;

/**
 * Manages loading and success state for async PDF operations.
 * Errors are reported via the provided setError (typically from useErrorHandler).
 */
export function useProcessingState(setError: ProcessingSetError) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const execute = useCallback(
    async (
      operation: () => Promise<void>,
      successMessage: string,
      formatError?: (err: unknown) => string,
    ) => {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      try {
        await operation();
        setSuccess(successMessage);
      } catch (err: unknown) {
        setError(formatError ? formatError(err) : getErrorMessage(err));
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [setError],
  );

  return {
    isProcessing,
    success,
    setSuccess,
    execute,
  };
}

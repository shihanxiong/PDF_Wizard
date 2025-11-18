import { useState, useCallback } from 'react';

/**
 * Hook for managing processing state (loading, error, success) consistently
 */
export function useProcessingState() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<void>, successMessage: string) => {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      try {
        await operation();
        setSuccess(successMessage);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : err?.toString() || 'Unknown error occurred';
        setError(errorMessage);
        throw err; // Re-throw for component-specific handling
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    isProcessing,
    error,
    success,
    setError,
    setSuccess,
    execute,
  };
}


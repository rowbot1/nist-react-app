/**
 * useSaveStatusMutation Hook
 *
 * Wraps mutation callbacks to automatically update save status indicators.
 * Use this hook to make any API mutation show save status in the header.
 */

import { useCallback } from 'react';
import { useSaveStatus } from '../contexts/SaveStatusContext';

interface SaveStatusMutationOptions<T, E = Error> {
  onSuccess?: (data: T) => void;
  onError?: (error: E) => void;
}

/**
 * Hook that provides wrapped mutation callbacks with save status updates
 */
export function useSaveStatusMutation() {
  const { startSaving, setSaved, setError } = useSaveStatus();

  /**
   * Wraps an async function to update save status
   */
  const withSaveStatus = useCallback(
    <T, Args extends unknown[]>(
      asyncFn: (...args: Args) => Promise<T>,
      options?: SaveStatusMutationOptions<T>
    ) => {
      return async (...args: Args): Promise<T> => {
        startSaving();
        try {
          const result = await asyncFn(...args);
          setSaved();
          options?.onSuccess?.(result);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Save failed';
          setError(errorMessage);
          options?.onError?.(error as Error);
          throw error;
        }
      };
    },
    [startSaving, setSaved, setError]
  );

  /**
   * Manual trigger functions for custom use cases
   */
  return {
    withSaveStatus,
    startSaving,
    setSaved,
    setError,
  };
}

export default useSaveStatusMutation;

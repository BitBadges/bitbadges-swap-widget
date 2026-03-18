import { useState, useCallback, useRef } from 'react';
import type { BitBadgesSwapClient } from '../api/client';
import type { SwapEstimateRequest, SwapEstimateResponse } from '../types';

interface UseSwapEstimateOptions {
  client: BitBadgesSwapClient;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
}

interface UseSwapEstimateReturn {
  estimate: SwapEstimateResponse | null;
  isLoading: boolean;
  error: Error | null;
  /** Fetch a swap estimate. Debounced by default. */
  fetchEstimate: (params: SwapEstimateRequest) => void;
  /** Fetch immediately without debounce */
  fetchEstimateImmediate: (params: SwapEstimateRequest) => Promise<SwapEstimateResponse>;
  /** Clear the current estimate */
  clear: () => void;
}

export function useSwapEstimate({
  client,
  debounceMs = 500,
}: UseSwapEstimateOptions): UseSwapEstimateReturn {
  const [estimate, setEstimate] = useState<SwapEstimateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEstimateImmediate = useCallback(
    async (params: SwapEstimateRequest): Promise<SwapEstimateResponse> => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const result = await client.getSwapEstimate(params);
        setEstimate(result);
        setIsLoading(false);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Swap estimate failed');
        // Only set error if not aborted
        if (!(err instanceof DOMException && (err as DOMException).name === 'AbortError')) {
          setError(e);
          setIsLoading(false);
        }
        throw e;
      }
    },
    [client]
  );

  const fetchEstimate = useCallback(
    (params: SwapEstimateRequest) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        fetchEstimateImmediate(params).catch(() => {
          // Error already set in state
        });
      }, debounceMs);
    },
    [fetchEstimateImmediate, debounceMs]
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    abortRef.current?.abort();
    setEstimate(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { estimate, isLoading, error, fetchEstimate, fetchEstimateImmediate, clear };
}

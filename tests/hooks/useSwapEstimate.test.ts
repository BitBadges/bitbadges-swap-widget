import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSwapEstimate } from '../../src/hooks/useSwapEstimate';
import { BitBadgesSwapClient } from '../../src/api/client';

describe('useSwapEstimate', () => {
  let mockClient: BitBadgesSwapClient;

  const mockEstimateResponse = {
    success: true,
    estimate: {
      tokenOutAmount: '1000000',
      tokenInAmount: '500000000000000',
      skipGoMsgs: [],
      assetPath: [
        { denom: 'abadge', chainId: 'bitbadges-1', how: 'genesis' as const },
        { denom: 'uosmo', chainId: 'bitbadges-1', how: 'swap' as const },
      ],
      doesSwap: true,
    },
  };

  beforeEach(() => {
    mockClient = new BitBadgesSwapClient('https://api.example.com');
    vi.spyOn(mockClient, 'getSwapEstimate').mockResolvedValue(mockEstimateResponse);
  });

  it('should start with no estimate and no loading', () => {
    const { result } = renderHook(() =>
      useSwapEstimate({ client: mockClient, debounceMs: 0 })
    );

    expect(result.current.estimate).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch estimate immediately with fetchEstimateImmediate', async () => {
    const { result } = renderHook(() =>
      useSwapEstimate({ client: mockClient, debounceMs: 0 })
    );

    await act(async () => {
      await result.current.fetchEstimateImmediate({
        tokenIn: '500000000000000abadge',
        tokenOutDenom: 'uosmo',
        chainIdsToAddresses: {},
        slippageTolerancePercent: '1',
      });
    });

    expect(result.current.estimate).toEqual(mockEstimateResponse);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set error on fetch failure', async () => {
    vi.spyOn(mockClient, 'getSwapEstimate').mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useSwapEstimate({ client: mockClient, debounceMs: 0 })
    );

    await act(async () => {
      try {
        await result.current.fetchEstimateImmediate({
          tokenIn: '500000000000000abadge',
          tokenOutDenom: 'uosmo',
          chainIdsToAddresses: {},
          slippageTolerancePercent: '1',
        });
      } catch {
        // expected
      }
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear estimate and error', async () => {
    const { result } = renderHook(() =>
      useSwapEstimate({ client: mockClient, debounceMs: 0 })
    );

    await act(async () => {
      await result.current.fetchEstimateImmediate({
        tokenIn: '500000000000000abadge',
        tokenOutDenom: 'uosmo',
        chainIdsToAddresses: {},
        slippageTolerancePercent: '1',
      });
    });

    expect(result.current.estimate).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should debounce fetchEstimate calls', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useSwapEstimate({ client: mockClient, debounceMs: 300 })
    );

    const params = {
      tokenIn: '500000000000000abadge',
      tokenOutDenom: 'uosmo',
      chainIdsToAddresses: {},
      slippageTolerancePercent: '1',
    };

    act(() => {
      result.current.fetchEstimate(params);
      result.current.fetchEstimate(params);
      result.current.fetchEstimate(params);
    });

    // Should not have been called yet
    expect(mockClient.getSwapEstimate).not.toHaveBeenCalled();

    // Advance timer past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Should have been called once (debounced)
    expect(mockClient.getSwapEstimate).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

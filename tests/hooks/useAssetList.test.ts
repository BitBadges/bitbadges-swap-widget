import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssetList } from '../../src/hooks/useAssetList';
import { BitBadgesSwapClient } from '../../src/api/client';
import type { Asset } from '../../src/types';

const mockAssets: Asset[] = [
  { denom: 'ubadge', chainId: 'bitbadges-1', symbol: 'BADGE', name: 'BitBadges', decimals: 6 },
  { denom: 'uosmo', chainId: 'osmosis-1', symbol: 'OSMO', name: 'Osmosis', decimals: 6 },
  { denom: 'uatom', chainId: 'cosmoshub-4', symbol: 'ATOM', name: 'Cosmos Hub', decimals: 6 },
];

describe('useAssetList', () => {
  let mockClient: BitBadgesSwapClient;

  beforeEach(() => {
    mockClient = new BitBadgesSwapClient('https://api.example.com');
    vi.spyOn(mockClient, 'getAssets').mockResolvedValue(mockAssets);
  });

  it('should auto-fetch assets on mount', async () => {
    const { result } = renderHook(() =>
      useAssetList({ client: mockClient })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(3);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should not auto-fetch when autoFetch is false', async () => {
    const { result } = renderHook(() =>
      useAssetList({ client: mockClient, autoFetch: false })
    );

    // Wait a tick to ensure nothing fires
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockClient.getAssets).not.toHaveBeenCalled();
    expect(result.current.assets).toHaveLength(0);
  });

  it('should filter by search query', async () => {
    const { result } = renderHook(() =>
      useAssetList({ client: mockClient })
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(3);
    });

    act(() => {
      result.current.setSearchQuery('badge');
    });

    expect(result.current.filteredAssets).toHaveLength(1);
    expect(result.current.filteredAssets[0].symbol).toBe('BADGE');
  });

  it('should filter by chain ID', async () => {
    const { result } = renderHook(() =>
      useAssetList({ client: mockClient })
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(3);
    });

    act(() => {
      result.current.setChainFilter('osmosis-1');
    });

    expect(result.current.filteredAssets).toHaveLength(1);
    expect(result.current.filteredAssets[0].denom).toBe('uosmo');
  });

  it('should combine search and chain filters', async () => {
    const { result } = renderHook(() =>
      useAssetList({ client: mockClient })
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(3);
    });

    act(() => {
      result.current.setChainFilter('bitbadges-1');
      result.current.setSearchQuery('osmo');
    });

    // Searching for 'osmo' but filtering to bitbadges-1 => no results
    expect(result.current.filteredAssets).toHaveLength(0);
  });

  it('should handle fetch errors', async () => {
    vi.spyOn(mockClient, 'getAssets').mockRejectedValue(new Error('API down'));

    const { result } = renderHook(() =>
      useAssetList({ client: mockClient })
    );

    await waitFor(() => {
      expect(result.current.error?.message).toBe('API down');
    });

    expect(result.current.isLoading).toBe(false);
  });
});

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { BitBadgesSwapClient } from '../api/client';
import type { Asset } from '../types';

interface UseAssetListOptions {
  client: BitBadgesSwapClient;
  /** If true, fetch assets on mount (default: true) */
  autoFetch?: boolean;
}

interface UseAssetListReturn {
  assets: Asset[];
  /** Filtered assets (after search/filter) */
  filteredAssets: Asset[];
  isLoading: boolean;
  error: Error | null;
  /** Text search query */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Filter by chain ID */
  chainFilter: string | null;
  setChainFilter: (chainId: string | null) => void;
  /** Refetch assets from the API */
  refetch: () => Promise<void>;
}

export function useAssetList({
  client,
  autoFetch = true,
}: UseAssetListOptions): UseAssetListReturn {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.getAssets();
      setAssets(result);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to fetch assets');
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Auto-fetch on mount (only once)
  useEffect(() => {
    if (autoFetch && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAssets();
    }
  }, [autoFetch, fetchAssets]);

  const filteredAssets = useMemo(() => {
    let result = assets;

    if (chainFilter) {
      result = result.filter((a) => a.chainId === chainFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.denom.toLowerCase().includes(q) ||
          (a.symbol && a.symbol.toLowerCase().includes(q)) ||
          (a.name && a.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [assets, searchQuery, chainFilter]);

  return {
    assets,
    filteredAssets,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    chainFilter,
    setChainFilter,
    refetch: fetchAssets,
  };
}

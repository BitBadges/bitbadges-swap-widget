import { useState, useEffect, useCallback } from 'react';
import type { BitBadgesSwapClient } from '../api/client';
import type { Pool, PoolsResponse } from '../types';

interface UsePoolInfoOptions {
  client: BitBadgesSwapClient;
  /** Fetch a single pool by ID on mount */
  poolId?: string;
  /** Or fetch all pools on mount */
  fetchAll?: boolean;
  /** Sort configuration for fetchAll */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UsePoolInfoReturn {
  pool: any | null;
  pools: Pool[];
  pagination: PoolsResponse['pagination'];
  isLoading: boolean;
  error: Error | null;
  /** Fetch a single pool by ID */
  fetchPool: (poolId: string) => Promise<void>;
  /** Fetch all pools with optional pagination */
  fetchPools: (bookmark?: string) => Promise<void>;
  /** Fetch pools that contain a specific denom */
  fetchPoolsByDenom: (denom: string) => Promise<void>;
  /** Fetch pools by asset pair */
  fetchPoolsByAssets: (asset1: string, asset2?: string) => Promise<void>;
}

export function usePoolInfo({
  client,
  poolId,
  fetchAll = false,
  sortBy,
  sortOrder,
}: UsePoolInfoOptions): UsePoolInfoReturn {
  const [pool, setPool] = useState<any | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [pagination, setPagination] = useState<PoolsResponse['pagination']>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPool = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.getPoolById(id);
        setPool(result.poolInfo);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pool'));
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const fetchPools = useCallback(
    async (bookmark?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.getPools({ sortBy, sortOrder, bookmark });
        setPools(result.pools);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pools'));
      } finally {
        setIsLoading(false);
      }
    },
    [client, sortBy, sortOrder]
  );

  const fetchPoolsByDenom = useCallback(
    async (denom: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.getPoolsByDenom(denom);
        setPools(result.pools);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pools by denom'));
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const fetchPoolsByAssets = useCallback(
    async (asset1: string, asset2?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.getPoolsByAssets(asset1, asset2);
        setPools(result.pools);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pools by assets'));
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  // Auto-fetch on mount if poolId or fetchAll is provided
  useEffect(() => {
    if (poolId) {
      fetchPool(poolId);
    } else if (fetchAll) {
      fetchPools();
    }
  }, [poolId, fetchAll, fetchPool, fetchPools]);

  return {
    pool,
    pools,
    pagination,
    isLoading,
    error,
    fetchPool,
    fetchPools,
    fetchPoolsByDenom,
    fetchPoolsByAssets,
  };
}

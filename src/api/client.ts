import type {
  SwapEstimateRequest,
  SwapEstimateResponse,
  Asset,
  AssetMap,
  Pool,
  PoolsResponse,
  PoolByIdResponse,
} from '../types';

const DEFAULT_API_URL = 'https://api.bitbadges.io';
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function validateApiUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid API URL: ${rawUrl}`);
  }

  if (parsed.protocol === 'https:') {
    return rawUrl.replace(/\/+$/, '');
  }

  if (parsed.protocol === 'http:' && LOCALHOST_HOSTS.has(parsed.hostname)) {
    return rawUrl.replace(/\/+$/, '');
  }

  throw new Error(
    `API URL must use https:// (http:// is only permitted for localhost): ${rawUrl}`
  );
}

/**
 * Standalone API client for the BitBadges indexer swap/pool endpoints.
 * No dependency on React or any frontend framework.
 */
export class BitBadgesSwapClient {
  private apiUrl: string;

  constructor(apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = validateApiUrl(apiUrl);
  }

  // --------------------------------------------------------------------------
  // Swap Estimate
  // POST /api/v0/swaps/estimate
  // --------------------------------------------------------------------------

  async getSwapEstimate(
    params: SwapEstimateRequest
  ): Promise<SwapEstimateResponse> {
    const res = await fetch(`${this.apiUrl}/api/v0/swaps/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as any)?.message ||
          (body as any)?.error ||
          `Swap estimate failed (${res.status})`
      );
    }

    return res.json() as Promise<SwapEstimateResponse>;
  }

  // --------------------------------------------------------------------------
  // Assets — fetched from Skip API via indexer proxy
  // GET /api/v0/skip/assets
  // --------------------------------------------------------------------------

  async getAssets(): Promise<Asset[]> {
    const res = await fetch(`${this.apiUrl}/api/v0/skip/assets`);
    if (!res.ok) {
      throw new Error(`Failed to fetch assets (${res.status})`);
    }

    const data = (await res.json()) as { chain_to_assets_map: AssetMap };
    const allAssets: Asset[] = [];

    for (const [chainId, assets] of Object.entries(
      data.chain_to_assets_map || {}
    )) {
      for (const asset of assets) {
        allAssets.push({
          denom: asset.denom,
          chainId,
          symbol: asset.symbol,
          name: asset.name,
          decimals: asset.decimals,
          logoUri: asset.logoUri || (asset as any).logo_uri,
          originChainId: asset.originChainId || (asset as any).origin_chain_id,
          originDenom: asset.originDenom || (asset as any).origin_denom,
        });
      }
    }

    return allAssets;
  }

  // --------------------------------------------------------------------------
  // Pools
  // GET  /api/v0/pools                   — all pools (paginated)
  // GET  /api/v0/pools/:poolId           — single pool by ID
  // GET  /api/v0/pools/byDenom?denom=    — pools by denom
  // GET  /api/v0/pools/byAssets?asset1=&asset2=  — pools by asset pair
  // POST /api/v0/pools/batch             — batch fetch by IDs
  // --------------------------------------------------------------------------

  async getPools(params?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    bookmark?: string;
  }): Promise<PoolsResponse> {
    const query = new URLSearchParams();
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params?.bookmark) query.set('bookmark', params.bookmark);

    const qs = query.toString();
    const url = `${this.apiUrl}/api/v0/pools${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch pools (${res.status})`);
    }

    return res.json() as Promise<PoolsResponse>;
  }

  async getPoolById(poolId: string): Promise<PoolByIdResponse> {
    const res = await fetch(`${this.apiUrl}/api/v0/pools/${poolId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch pool ${poolId} (${res.status})`);
    }
    return res.json() as Promise<PoolByIdResponse>;
  }

  async getPoolsByDenom(denom: string): Promise<{ pools: Pool[]; count: number }> {
    const res = await fetch(
      `${this.apiUrl}/api/v0/pools/byDenom?denom=${encodeURIComponent(denom)}`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch pools by denom (${res.status})`);
    }
    return res.json() as Promise<{ pools: Pool[]; count: number }>;
  }

  async getPoolsByAssets(
    asset1: string,
    asset2?: string
  ): Promise<{ pools: Pool[]; count: number }> {
    const query = new URLSearchParams({ asset1 });
    if (asset2) query.set('asset2', asset2);

    const res = await fetch(
      `${this.apiUrl}/api/v0/pools/byAssets?${query.toString()}`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch pools by assets (${res.status})`);
    }
    return res.json() as Promise<{ pools: Pool[]; count: number }>;
  }

  // --------------------------------------------------------------------------
  // Skip chains (for chain metadata)
  // GET /api/v0/skip/chains
  // --------------------------------------------------------------------------

  async getChains(): Promise<
    Array<{ chain_id: string; pretty_name?: string; [key: string]: any }>
  > {
    const res = await fetch(`${this.apiUrl}/api/v0/skip/chains`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chains (${res.status})`);
    }
    const data = (await res.json()) as {
      chains: Array<{ chain_id: string; [key: string]: any }>;
    };
    return data.chains;
  }

  // --------------------------------------------------------------------------
  // Transaction tracking
  // POST /api/v0/skip/v2/tx/track
  // GET  /api/v0/skip/v2/tx/status?txHash=&chainId=
  // --------------------------------------------------------------------------

  async trackTransaction(txHash: string, chainId: string): Promise<any> {
    const res = await fetch(`${this.apiUrl}/api/v0/skip/v2/tx/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_hash: txHash, chain_id: chainId }),
    });
    if (!res.ok) {
      throw new Error(`Failed to track transaction (${res.status})`);
    }
    return res.json();
  }

  async getTransactionStatus(
    txHash: string,
    chainId?: string
  ): Promise<any> {
    const query = new URLSearchParams({ txHash });
    if (chainId) query.set('chainId', chainId);

    const res = await fetch(
      `${this.apiUrl}/api/v0/skip/v2/tx/status?${query.toString()}`
    );
    if (!res.ok) {
      throw new Error(`Failed to get transaction status (${res.status})`);
    }
    return res.json();
  }
}

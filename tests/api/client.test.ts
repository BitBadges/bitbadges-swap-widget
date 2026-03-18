import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BitBadgesSwapClient } from '../../src/api/client';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('BitBadgesSwapClient', () => {
  let client: BitBadgesSwapClient;

  beforeEach(() => {
    client = new BitBadgesSwapClient('https://api.example.com');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSwapEstimate', () => {
    it('should POST to /api/v0/swaps/estimate with correct body', async () => {
      const mockResponse = {
        success: true,
        estimate: {
          tokenOutAmount: '1000000',
          tokenInAmount: '500000',
          skipGoMsgs: [],
          assetPath: [],
          doesSwap: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const params = {
        tokenIn: '500000ubadge',
        tokenOutDenom: 'uosmo',
        chainIdsToAddresses: { 'bitbadges-1': 'bb1abc123' },
        slippageTolerancePercent: '1',
      };

      const result = await client.getSwapEstimate(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v0/swaps/estimate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }
      );
      expect(result.success).toBe(true);
      expect(result.estimate.tokenOutAmount).toBe('1000000');
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid tokenIn' }),
      });

      await expect(
        client.getSwapEstimate({
          tokenIn: '',
          tokenOutDenom: 'uosmo',
          chainIdsToAddresses: {},
          slippageTolerancePercent: '1',
        })
      ).rejects.toThrow('Invalid tokenIn');
    });

    it('should handle JSON parse failure on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('bad json')),
      });

      await expect(
        client.getSwapEstimate({
          tokenIn: '1ubadge',
          tokenOutDenom: 'uosmo',
          chainIdsToAddresses: {},
          slippageTolerancePercent: '1',
        })
      ).rejects.toThrow('Swap estimate failed (500)');
    });
  });

  describe('getAssets', () => {
    it('should fetch and flatten assets from chain_to_assets_map', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            chain_to_assets_map: {
              'bitbadges-1': [
                { denom: 'ubadge', symbol: 'BADGE', name: 'BitBadges', decimals: 6 },
              ],
              'osmosis-1': [
                { denom: 'uosmo', symbol: 'OSMO', name: 'Osmosis', decimals: 6 },
              ],
            },
          }),
      });

      const assets = await client.getAssets();

      expect(assets).toHaveLength(2);
      expect(assets[0].chainId).toBe('bitbadges-1');
      expect(assets[0].denom).toBe('ubadge');
      expect(assets[1].chainId).toBe('osmosis-1');
      expect(assets[1].symbol).toBe('OSMO');
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
      await expect(client.getAssets()).rejects.toThrow('Failed to fetch assets (503)');
    });
  });

  describe('getPools', () => {
    it('should fetch pools with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            pools: [{ poolId: '1', asset1: 'ubadge', asset2: 'uosmo' }],
            pagination: { hasMore: false },
          }),
      });

      const result = await client.getPools({ sortBy: 'liquidity', sortOrder: 'desc' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v0/pools?sortBy=liquidity&sortOrder=desc'
      );
      expect(result.pools).toHaveLength(1);
    });
  });

  describe('getPoolById', () => {
    it('should fetch a single pool', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, poolInfo: { id: '1' } }),
      });

      const result = await client.getPoolById('1');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/v0/pools/1');
    });
  });

  describe('constructor', () => {
    it('should strip trailing slashes from apiUrl', async () => {
      const c = new BitBadgesSwapClient('https://api.example.com///');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ chain_to_assets_map: {} }),
      });

      await c.getAssets();
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/v0/skip/assets');
    });
  });
});

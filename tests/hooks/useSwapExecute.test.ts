import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSwapExecute,
  validateAndBuildCosmosMsgs,
  validateSlippagePercent,
  ALLOWED_SWAP_TYPE_URLS,
} from '../../src/hooks/useSwapExecute';
import type { SwapEstimateResponse, WalletAdapter } from '../../src/types';

const CONNECTED_ADDR = 'bb1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu';

function createValidEstimate(
  overrides?: Partial<SwapEstimateResponse['estimate']>
): SwapEstimateResponse {
  return {
    success: true,
    estimate: {
      tokenInAmount: '1000000',
      tokenOutAmount: '2000000',
      doesSwap: true,
      assetPath: [
        { denom: 'ubadge', chainId: 'bitbadges-1', how: 'genesis' },
        { denom: 'uosmo', chainId: 'bitbadges-1', how: 'swap' },
      ],
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              tokenOutMinAmount: '1980000',
            }),
          },
        },
      ],
      ...overrides,
    },
  };
}

function createMockWallet(overrides?: Partial<WalletAdapter>): WalletAdapter {
  return {
    isConnected: true,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddress: vi.fn().mockResolvedValue(CONNECTED_ADDR),
    signAndBroadcast: vi.fn().mockResolvedValue('TX_HASH_123'),
    ...overrides,
  };
}

describe('validateSlippagePercent', () => {
  it('accepts valid slippage values within (0, 50]', () => {
    expect(validateSlippagePercent('0.5')).toBe(0.5);
    expect(validateSlippagePercent(1)).toBe(1);
    expect(validateSlippagePercent('50')).toBe(50);
  });

  it('rejects <= 0, > 50, NaN, and Infinity', () => {
    expect(() => validateSlippagePercent('0')).toThrow(/Invalid slippage/);
    expect(() => validateSlippagePercent('-1')).toThrow(/Invalid slippage/);
    expect(() => validateSlippagePercent('50.01')).toThrow(/Invalid slippage/);
    expect(() => validateSlippagePercent('99')).toThrow(/Invalid slippage/);
    expect(() => validateSlippagePercent('abc')).toThrow(/Invalid slippage/);
    expect(() => validateSlippagePercent(Infinity)).toThrow(/Invalid slippage/);
  });
});

describe('validateAndBuildCosmosMsgs', () => {
  it('accepts valid BitBadges gamm MsgSwapExactAmountIn (camelCase)', () => {
    const estimate = createValidEstimate();
    const msgs = validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
      tokenInDenom: 'ubadge',
      tokenInAmount: '1000000',
      slippageTolerancePercent: '1',
    });

    expect(msgs).toHaveLength(1);
    expect(msgs[0].typeUrl).toBe('/gamm.v1beta1.MsgSwapExactAmountIn');
    expect(msgs[0].value.sender).toBe(CONNECTED_ADDR);
  });

  it('accepts valid Osmosis poolmanager MsgSwapExactAmountIn (snake_case)', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'osmosis-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ pool_id: '42', token_out_denom: 'uosmo' }],
              token_in: { denom: 'ubadge', amount: '1000000' },
              token_out_min_amount: '1980000',
            }),
          },
        },
      ],
    });

    const msgs = validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
      tokenInDenom: 'ubadge',
      tokenInAmount: '1000000',
      slippageTolerancePercent: '1',
    });

    expect(msgs).toHaveLength(1);
    expect(msgs[0].typeUrl).toBe(
      '/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn'
    );
  });

  it('accepts valid MsgSwapExactAmountInWithIBCTransfer', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              tokenOutMinAmount: '1980000',
              ibcTransferInfo: {
                sourceChannel: 'channel-0',
                receiver: 'osmo1receiver',
                memo: '',
                timeoutTimestamp: '1700000000000000000',
              },
            }),
          },
        },
      ],
    });

    const msgs = validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
      tokenInDenom: 'ubadge',
      tokenInAmount: '1000000',
      slippageTolerancePercent: '1',
    });

    expect(msgs).toHaveLength(1);
    expect(msgs[0].typeUrl).toBe(
      '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer'
    );
  });

  it('accepts valid IBC MsgTransfer', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge'],
            msg_type_url: '/ibc.applications.transfer.v1.MsgTransfer',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              receiver: 'osmo1dest',
              source_channel: 'channel-0',
              source_port: 'transfer',
              token: { denom: 'ubadge', amount: '1000000' },
            }),
          },
        },
      ],
    });

    const msgs = validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
      tokenInDenom: 'ubadge',
      tokenInAmount: '1000000',
      slippageTolerancePercent: '1',
    });

    expect(msgs).toHaveLength(1);
    expect(msgs[0].typeUrl).toBe('/ibc.applications.transfer.v1.MsgTransfer');
  });

  it('rejects disallowed Cosmos message types like MsgSend and MsgGrant', () => {
    for (const badType of [
      '/cosmos.bank.v1beta1.MsgSend',
      '/cosmos.authz.v1beta1.MsgGrant',
      '/cosmwasm.wasm.v1.MsgExecuteContract',
      '',
    ]) {
      expect(ALLOWED_SWAP_TYPE_URLS.has(badType)).toBe(false);
      const estimate = createValidEstimate({
        skipGoMsgs: [
          {
            multi_chain_msg: {
              chain_id: 'bitbadges-1',
              path: ['ubadge'],
              msg_type_url: badType,
              msg: JSON.stringify({
                sender: CONNECTED_ADDR,
                from_address: CONNECTED_ADDR,
                to_address: 'bb1other',
                amount: [{ denom: 'ubadge', amount: '1000000' }],
              }),
            },
          },
        ],
      });

      expect(() =>
        validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR)
      ).toThrow(/Disallowed message type URL/);
    }
  });

  it('rejects message whose sender does not match connected wallet address', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: 'bb1differentaddress',
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              tokenOutMinAmount: '1980000',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/Message sender mismatch/);
  });

  it('rejects input denom mismatch', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['uatom', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'uatom', amount: '1000000' },
              tokenOutMinAmount: '1980000',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/Swap input denom mismatch/);
  });

  it('rejects input amount mismatch', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '999999999999' },
              tokenOutMinAmount: '1980000',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/Swap input amount mismatch/);
  });

  it('rejects tokenOutMinAmount below slippage-adjusted minimum', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              // Quoted 2,000,000 with 1% slippage => min 1,980,000
              tokenOutMinAmount: '1900000',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/below slippage-adjusted minimum/);
  });

  it('rejects zero tokenOutMinAmount', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              tokenOutMinAmount: '0',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/tokenOutMinAmount/);
  });

  it('rejects swap-with-IBC missing ibcTransferInfo', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              routes: [{ poolId: '1', tokenOutDenom: 'uosmo' }],
              tokenIn: { denom: 'ubadge', amount: '1000000' },
              tokenOutMinAmount: '1980000',
            }),
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      })
    ).toThrow(/ibcTransferInfo/);
  });

  it('rejects malformed JSON payload', () => {
    const estimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge', 'uosmo'],
            msg_type_url: '/gamm.v1beta1.MsgSwapExactAmountIn',
            msg: '{not-valid-json',
          },
        },
      ],
    });

    expect(() =>
      validateAndBuildCosmosMsgs(estimate, CONNECTED_ADDR)
    ).toThrow(/Invalid JSON payload/);
  });
});

describe('useSwapExecute', () => {
  it('validates and broadcasts valid swap messages', async () => {
    const wallet = createMockWallet();
    const onSwapComplete = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useSwapExecute({ walletAdapter: wallet, onSwapComplete, onError })
    );

    let hash: string | null = null;
    await act(async () => {
      hash = await result.current.executeSwap(createValidEstimate(), {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      });
    });

    expect(hash).toBe('TX_HASH_123');
    expect(wallet.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(onSwapComplete).toHaveBeenCalledWith('TX_HASH_123');
    expect(onError).not.toHaveBeenCalled();
  });

  it('never calls signAndBroadcast when message validation fails', async () => {
    const wallet = createMockWallet();
    const onSwapComplete = vi.fn();
    const onError = vi.fn();

    const badEstimate = createValidEstimate({
      skipGoMsgs: [
        {
          multi_chain_msg: {
            chain_id: 'bitbadges-1',
            path: ['ubadge'],
            msg_type_url: '/cosmos.bank.v1beta1.MsgSend',
            msg: JSON.stringify({
              sender: CONNECTED_ADDR,
              to_address: 'bb1other',
              amount: [{ denom: 'ubadge', amount: '1000000' }],
            }),
          },
        },
      ],
    });

    const { result } = renderHook(() =>
      useSwapExecute({ walletAdapter: wallet, onSwapComplete, onError })
    );

    let hash: string | null = null;
    await act(async () => {
      hash = await result.current.executeSwap(badEstimate, {
        tokenInDenom: 'ubadge',
        tokenInAmount: '1000000',
        slippageTolerancePercent: '1',
      });
    });

    expect(hash).toBeNull();
    expect(wallet.signAndBroadcast).not.toHaveBeenCalled();
    expect(onSwapComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toMatch(/Disallowed message type URL/);
  });
});

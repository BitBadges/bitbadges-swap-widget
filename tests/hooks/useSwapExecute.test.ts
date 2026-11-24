import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwapExecute } from '../../src/hooks/useSwapExecute';
import type { SwapEstimateResponse, WalletAdapter } from '../../src/types';

describe('useSwapExecute', () => {
  it('should broadcast Cosmos swap messages with abadge fee denom', async () => {
    const signAndBroadcast = vi.fn().mockResolvedValue('TXHASH123');
    const walletAdapter: WalletAdapter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getAddress: vi.fn().mockResolvedValue('bb1abc123'),
      signAndBroadcast,
      isConnected: true,
    };

    const estimate: SwapEstimateResponse = {
      success: true,
      estimate: {
        tokenOutAmount: '1000000',
        tokenInAmount: '1000000000000000000',
        skipGoMsgs: [
          {
            multi_chain_msg: {
              chain_id: 'bitbadges-1',
              path: ['bitbadges-1'],
              msg: JSON.stringify({ sender: 'bb1abc123', token_in: { denom: 'abadge', amount: '1000000000000000000' } }),
              msg_type_url: '/cosmos.bank.v1beta1.MsgSend',
            },
          },
        ],
        assetPath: [
          { denom: 'abadge', chainId: 'bitbadges-1', how: 'genesis' },
          { denom: 'uosmo', chainId: 'bitbadges-1', how: 'swap' },
        ],
        doesSwap: true,
      },
    };

    const onSwapComplete = vi.fn();
    const { result } = renderHook(() =>
      useSwapExecute({ walletAdapter, onSwapComplete })
    );

    let hash: string | null = null;
    await act(async () => {
      hash = await result.current.executeSwap(estimate);
    });

    expect(hash).toBe('TXHASH123');
    expect(signAndBroadcast).toHaveBeenCalledWith(
      [
        {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: {
            sender: 'bb1abc123',
            token_in: { denom: 'abadge', amount: '1000000000000000000' },
          },
        },
      ],
      {
        amount: [{ denom: 'abadge', amount: '0' }],
        gas: '500000',
      }
    );
    expect(onSwapComplete).toHaveBeenCalledWith('TXHASH123');
  });
});

import { useState, useCallback } from 'react';
import type { WalletAdapter, SwapEstimateResponse, SkipGoMessage } from '../types';

interface UseSwapExecuteOptions {
  walletAdapter: WalletAdapter | null;
  /** Called after successful broadcast */
  onSwapComplete?: (txHash: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

interface UseSwapExecuteReturn {
  /** Execute a swap using the messages from a swap estimate */
  executeSwap: (estimate: SwapEstimateResponse) => Promise<string | null>;
  isExecuting: boolean;
  txHash: string | null;
  error: Error | null;
  /** Reset execution state */
  reset: () => void;
}

/**
 * Constructs and broadcasts swap transactions from estimate results.
 *
 * For Cosmos messages (multi_chain_msg), it extracts the msg and msg_type_url
 * and calls the wallet adapter to sign and broadcast.
 *
 * EVM transactions are also supported via the wallet adapter.
 */
export function useSwapExecute({
  walletAdapter,
  onSwapComplete,
  onError,
}: UseSwapExecuteOptions): UseSwapExecuteReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const executeSwap = useCallback(
    async (estimate: SwapEstimateResponse): Promise<string | null> => {
      if (!walletAdapter) {
        const e = new Error('Wallet not connected');
        setError(e);
        onError?.(e);
        return null;
      }

      if (!walletAdapter.isConnected) {
        const e = new Error('Wallet not connected');
        setError(e);
        onError?.(e);
        return null;
      }

      const msgs = estimate.estimate.skipGoMsgs;
      if (!msgs || msgs.length === 0) {
        const e = new Error('No swap messages in estimate');
        setError(e);
        onError?.(e);
        return null;
      }

      setIsExecuting(true);
      setError(null);
      setTxHash(null);

      try {
        // Build the transaction messages from the SkipGo format
        const cosmosMsgs = buildCosmosMsgs(msgs);

        const fee = {
          amount: [{ denom: 'abadge', amount: '0' }],
          gas: '500000',
        };

        const hash = await walletAdapter.signAndBroadcast(cosmosMsgs, fee);
        setTxHash(hash);
        onSwapComplete?.(hash);
        return hash;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Swap execution failed');
        setError(e);
        onError?.(e);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [walletAdapter, onSwapComplete, onError]
  );

  const reset = useCallback(() => {
    setIsExecuting(false);
    setTxHash(null);
    setError(null);
  }, []);

  return { executeSwap, isExecuting, txHash, error, reset };
}

/**
 * Extract Cosmos SDK messages from SkipGoMessage format.
 * Each multi_chain_msg contains a JSON-encoded msg and a msg_type_url.
 */
function buildCosmosMsgs(skipGoMsgs: SkipGoMessage[]): any[] {
  return skipGoMsgs
    .filter((m) => m.multi_chain_msg)
    .map((m) => {
      const mcm = m.multi_chain_msg!;
      const msgBody = JSON.parse(mcm.msg);
      return {
        typeUrl: mcm.msg_type_url,
        value: msgBody,
      };
    });
}

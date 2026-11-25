import { useState, useCallback } from 'react';
import type { WalletAdapter, SwapEstimateResponse, SkipGoMessage } from '../types';

/**
 * Explicit allowlist of Cosmos SDK message type URLs permitted for swap execution.
 */
export const ALLOWED_SWAP_TYPE_URLS: ReadonlySet<string> = new Set([
  '/gamm.v1beta1.MsgSwapExactAmountIn',
  '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer',
  '/poolmanager.v1beta1.MsgSwapExactAmountIn',
  '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
  '/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn',
  '/ibc.applications.transfer.v1.MsgTransfer',
]);

const SWAP_EXACT_IN_TYPE_URLS: ReadonlySet<string> = new Set([
  '/gamm.v1beta1.MsgSwapExactAmountIn',
  '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer',
  '/poolmanager.v1beta1.MsgSwapExactAmountIn',
  '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
  '/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn',
]);

const IBC_TRANSFER_TYPE_URL = '/ibc.applications.transfer.v1.MsgTransfer';

export const MIN_SLIPPAGE_PERCENT = 0.01;
export const MAX_SLIPPAGE_PERCENT = 50;
export const HIGH_SLIPPAGE_WARNING_PERCENT = 5;

const POSITIVE_INT_REGEX = /^\d+$/;

export interface SwapExecutionExpectation {
  /** Expected input token denom for the quoted swap */
  tokenInDenom?: string;
  /** Expected input token base-unit integer amount */
  tokenInAmount?: string;
  /** Slippage tolerance percentage in (0, 50] */
  slippageTolerancePercent?: string | number;
}

export interface CosmosMsg {
  typeUrl: string;
  value: Record<string, any>;
}

interface UseSwapExecuteOptions {
  walletAdapter: WalletAdapter | null;
  /** Called after successful broadcast */
  onSwapComplete?: (txHash: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

interface UseSwapExecuteReturn {
  /** Execute a swap using the messages from a swap estimate */
  executeSwap: (
    estimate: SwapEstimateResponse,
    expected?: SwapExecutionExpectation
  ) => Promise<string | null>;
  isExecuting: boolean;
  txHash: string | null;
  error: Error | null;
  /** Reset execution state */
  reset: () => void;
}

/**
 * Validate a slippage percentage value, returning a finite number within (0, MAX_SLIPPAGE_PERCENT].
 */
export function validateSlippagePercent(value: string | number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > MAX_SLIPPAGE_PERCENT) {
    throw new Error(
      `Invalid slippage tolerance: must be greater than 0% and at most ${MAX_SLIPPAGE_PERCENT}%`
    );
  }
  return num;
}

function parsePositiveBigInt(value: unknown, fieldName: string): bigint {
  if (typeof value !== 'string' || !POSITIVE_INT_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName}: expected positive integer string`);
  }
  const parsed = BigInt(value);
  if (parsed <= 0n) {
    throw new Error(`Invalid ${fieldName}: must be greater than 0`);
  }
  return parsed;
}

function computeMinOutputForSlippage(
  quotedOut: bigint,
  slippagePercent: number
): bigint {
  // Scale percentage to parts per million (1% = 10,000 ppm) to support up to 4 decimals
  const slippagePpm = BigInt(Math.ceil(slippagePercent * 10_000));
  const boundedPpm = slippagePpm > 1_000_000n ? 1_000_000n : slippagePpm;
  return (quotedOut * (1_000_000n - boundedPpm)) / 1_000_000n;
}

/**
 * Validate and build Cosmos SDK messages from a SwapEstimateResponse before signing.
 *
 * Enforces:
 * - Every message typeUrl is in ALLOWED_SWAP_TYPE_URLS
 * - Every message sender matches the connected wallet address
 * - Input token denom and amount match the quoted swap request
 * - Swap messages specify a positive tokenOutMinAmount respecting slippage tolerance
 * - IBC transfer messages specify valid source channel, receiver, and token
 */
export function validateAndBuildCosmosMsgs(
  estimate: SwapEstimateResponse,
  connectedAddress: string,
  expected?: SwapExecutionExpectation
): CosmosMsg[] {
  if (!connectedAddress || typeof connectedAddress !== 'string') {
    throw new Error('Connected wallet address is required to validate swap messages');
  }

  const skipGoMsgs: SkipGoMessage[] = estimate?.estimate?.skipGoMsgs ?? [];
  if (skipGoMsgs.length === 0) {
    throw new Error('No swap messages in estimate');
  }

  const slippagePercent =
    expected?.slippageTolerancePercent !== undefined
      ? validateSlippagePercent(expected.slippageTolerancePercent)
      : MAX_SLIPPAGE_PERCENT;

  const expectedDenom =
    expected?.tokenInDenom ?? estimate.estimate.assetPath?.[0]?.denom;

  const expectedAmountStr =
    expected?.tokenInAmount && POSITIVE_INT_REGEX.test(expected.tokenInAmount)
      ? expected.tokenInAmount
      : estimate.estimate.tokenInAmount &&
          POSITIVE_INT_REGEX.test(estimate.estimate.tokenInAmount)
        ? estimate.estimate.tokenInAmount
        : undefined;

  const quotedOutAmount =
    estimate.estimate.tokenOutAmount &&
    POSITIVE_INT_REGEX.test(estimate.estimate.tokenOutAmount)
      ? BigInt(estimate.estimate.tokenOutAmount)
      : null;

  const cosmosMsgs: CosmosMsg[] = [];

  for (let i = 0; i < skipGoMsgs.length; i++) {
    const rawMsg = skipGoMsgs[i];
    if (!rawMsg.multi_chain_msg) {
      throw new Error(`Unsupported message format at index ${i}: expected multi_chain_msg`);
    }

    const mcm = rawMsg.multi_chain_msg;
    const typeUrl = mcm.msg_type_url;

    if (!typeUrl || !ALLOWED_SWAP_TYPE_URLS.has(typeUrl)) {
      throw new Error(`Disallowed message type URL: ${typeUrl || '<empty>'}`);
    }

    let msgBody: unknown;
    try {
      msgBody = typeof mcm.msg === 'string' ? JSON.parse(mcm.msg) : mcm.msg;
    } catch {
      throw new Error(`Invalid JSON payload in message at index ${i}`);
    }

    if (!msgBody || typeof msgBody !== 'object' || Array.isArray(msgBody)) {
      throw new Error(`Invalid message body at index ${i}: expected JSON object`);
    }

    const body = msgBody as Record<string, any>;

    // Verify sender matches connected wallet address
    if (typeof body.sender !== 'string' || body.sender !== connectedAddress) {
      throw new Error(
        `Message sender mismatch at index ${i}: expected ${connectedAddress}`
      );
    }

    if (SWAP_EXACT_IN_TYPE_URLS.has(typeUrl)) {
      const tokenIn = body.tokenIn ?? body.token_in;
      if (!tokenIn || typeof tokenIn !== 'object') {
        throw new Error(`Swap message at index ${i} is missing tokenIn`);
      }

      if (typeof tokenIn.denom !== 'string' || tokenIn.denom.length === 0) {
        throw new Error(`Swap message at index ${i} has invalid tokenIn denom`);
      }

      const msgTokenInAmount = parsePositiveBigInt(
        tokenIn.amount,
        `tokenIn.amount (index ${i})`
      );

      if (i === 0) {
        if (expectedDenom && tokenIn.denom !== expectedDenom) {
          throw new Error(
            `Swap input denom mismatch: expected ${expectedDenom}, got ${tokenIn.denom}`
          );
        }
        if (expectedAmountStr && msgTokenInAmount !== BigInt(expectedAmountStr)) {
          throw new Error(
            `Swap input amount mismatch: expected ${expectedAmountStr}, got ${tokenIn.amount}`
          );
        }
      }

      if (!Array.isArray(body.routes) || body.routes.length === 0) {
        throw new Error(`Swap message at index ${i} must include at least one route`);
      }

      const minOutRaw = body.tokenOutMinAmount ?? body.token_out_min_amount;
      const minOutAmount = parsePositiveBigInt(
        minOutRaw,
        `tokenOutMinAmount (index ${i})`
      );

      if (quotedOutAmount !== null && quotedOutAmount > 0n) {
        const minAcceptable = computeMinOutputForSlippage(
          quotedOutAmount,
          slippagePercent
        );
        if (minAcceptable > 0n && minOutAmount < minAcceptable) {
          throw new Error(
            `Swap tokenOutMinAmount (${minOutAmount.toString()}) is below slippage-adjusted minimum (${minAcceptable.toString()})`
          );
        }
      }

      if (typeUrl === '/gamm.v1beta1.MsgSwapExactAmountInWithIBCTransfer') {
        const ibcInfo = body.ibcTransferInfo ?? body.ibc_transfer_info;
        const sourceChannel = ibcInfo?.sourceChannel ?? ibcInfo?.source_channel;
        const receiver = ibcInfo?.receiver;
        if (
          !ibcInfo ||
          typeof sourceChannel !== 'string' ||
          sourceChannel.length === 0 ||
          typeof receiver !== 'string' ||
          receiver.length === 0
        ) {
          throw new Error(
            `Swap-with-IBC message at index ${i} is missing valid ibcTransferInfo`
          );
        }
      }
    } else if (typeUrl === IBC_TRANSFER_TYPE_URL) {
      const token = body.token;
      if (!token || typeof token !== 'object') {
        throw new Error(`IBC transfer message at index ${i} is missing token`);
      }
      if (typeof token.denom !== 'string' || token.denom.length === 0) {
        throw new Error(`IBC transfer message at index ${i} has invalid token denom`);
      }
      const msgTokenAmount = parsePositiveBigInt(
        token.amount,
        `token.amount (index ${i})`
      );

      if (i === 0) {
        if (expectedDenom && token.denom !== expectedDenom) {
          throw new Error(
            `IBC transfer denom mismatch: expected ${expectedDenom}, got ${token.denom}`
          );
        }
        if (expectedAmountStr && msgTokenAmount !== BigInt(expectedAmountStr)) {
          throw new Error(
            `IBC transfer amount mismatch: expected ${expectedAmountStr}, got ${token.amount}`
          );
        }
      }

      const sourceChannel = body.source_channel ?? body.sourceChannel;
      if (typeof sourceChannel !== 'string' || sourceChannel.length === 0) {
        throw new Error(`IBC transfer message at index ${i} is missing source_channel`);
      }
      if (typeof body.receiver !== 'string' || body.receiver.length === 0) {
        throw new Error(`IBC transfer message at index ${i} is missing receiver`);
      }
    }

    cosmosMsgs.push({
      typeUrl,
      value: body,
    });
  }

  if (cosmosMsgs.length === 0) {
    throw new Error('No valid Cosmos swap messages in estimate');
  }

  return cosmosMsgs;
}

/**
 * Constructs, validates, and broadcasts swap transactions from estimate results.
 *
 * For Cosmos messages (multi_chain_msg), it validates each message's type URL,
 * signer, input token, and slippage bounds before invoking the wallet adapter.
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
    async (
      estimate: SwapEstimateResponse,
      expected?: SwapExecutionExpectation
    ): Promise<string | null> => {
      if (!walletAdapter || !walletAdapter.isConnected) {
        const e = new Error('Wallet not connected');
        setError(e);
        onError?.(e);
        return null;
      }

      const msgs = estimate.estimate?.skipGoMsgs;
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
        const connectedAddress = await walletAdapter.getAddress();
        const cosmosMsgs = validateAndBuildCosmosMsgs(
          estimate,
          connectedAddress,
          expected
        );

        const fee = {
          amount: [{ denom: 'ubadge', amount: '0' }],
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

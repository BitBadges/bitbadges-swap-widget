// ============================================================================
// Widget Props
// ============================================================================

export interface BitBadgesSwapProps {
  /** Base URL for the BitBadges indexer API */
  apiUrl?: string;
  /** Default source token denom (e.g. "ubadge") */
  defaultSourceDenom?: string;
  /** Default destination token denom */
  defaultDestDenom?: string;
  /** Theme: 'dark' | 'light' or a custom CSS class name */
  theme?: 'dark' | 'light' | string;
  /** Called when a swap transaction is successfully broadcast */
  onSwapComplete?: (txHash: string) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
  /** When true, shows compliance warnings for restricted tokens */
  complianceMode?: boolean;
  /** Wallet connection configuration */
  walletConfig?: WalletConfig;
  /** Custom wallet adapter (overrides built-in Keplr connection) */
  walletAdapter?: WalletAdapter;
}

// ============================================================================
// Wallet
// ============================================================================

export interface WalletAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  signAndBroadcast(msgs: any[], fee: any): Promise<string>;
  isConnected: boolean;
}

export interface WalletConfig {
  /** Cosmos RPC URL for signing transactions */
  cosmosRpcUrl?: string;
  /** EVM RPC URL (if EVM signing is needed) */
  evmRpcUrl?: string;
  /** Chain ID string (e.g. "bitbadges-1") */
  chainId?: string;
}

// ============================================================================
// Swap Estimate (mirrors indexer iEstimateSwapPayload / iEstimateSwapSuccessResponse)
// ============================================================================

export interface SwapEstimateRequest {
  /** Token in string. Formats: "amount:1,denom:ubadge" or "1ubadge" */
  tokenIn: string;
  /** Chain ID for the source token. Defaults to BitBadges chain. */
  tokenInChainId?: string;
  /** Denom of the token to receive */
  tokenOutDenom: string;
  /** Chain ID for the destination token. Defaults to BitBadges chain. */
  tokenOutChainId?: string;
  /** Mapping of chain IDs to user addresses */
  chainIdsToAddresses: Record<string, string>;
  /** Optional affiliate fee configuration per chain */
  chainIdsToAffiliates?: Record<
    string,
    { affiliates: Array<{ address: string; basis_points_fee: string }> }
  >;
  /** Slippage tolerance as percentage (0-100) */
  slippageTolerancePercent: string | number;
  /** Force recheck compliance (bypasses 5min cache) */
  forcefulRecheckCompliance?: boolean;
  /** Only use local BitBadges pools (no cross-chain routing) */
  isLocalOnly?: boolean;
}

export interface SkipGoMessage {
  multi_chain_msg?: {
    chain_id: string;
    path: string[];
    msg: string;
    msg_type_url: string;
  };
  evm_tx?: {
    chain_id: string;
    to: string;
    value: string;
    data: string;
    required_erc20_approvals?: Array<{ token: string; spender: string }>;
    signer_address: string;
  };
}

export interface AssetPathStep {
  denom: string;
  chainId: string;
  how: 'genesis' | 'swap' | 'transfer';
}

export interface SwapEstimateResponse {
  success: boolean;
  estimate: {
    tokenOutAmount: string;
    tokenInAmount: string;
    skipGoMsgs: SkipGoMessage[];
    assetPath: AssetPathStep[];
    doesSwap: boolean;
    lowLiquidityWarning?: boolean;
    complianceNotPassedWarning?: boolean;
    complianceErrorMessage?: string;
    estimatedTime?: number;
    fallbackAsset?: { denom: string; chainId: string };
    autoRedirectedToWETH?: boolean;
    rerouted?: boolean;
  };
}

// ============================================================================
// Assets (from Skip API via indexer)
// ============================================================================

export interface Asset {
  denom: string;
  chainId: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoUri?: string;
  /** The originating chain for IBC assets */
  originChainId?: string;
  originDenom?: string;
}

export interface AssetMap {
  [chainId: string]: Asset[];
}

// ============================================================================
// Pools (mirrors SDK iLiquidityPoolInfoDoc)
// ============================================================================

export interface CosmosCoin {
  denom: string;
  amount: string;
}

export interface PoolVolume {
  daily: CosmosCoin[];
  weekly: CosmosCoin[];
  monthly: CosmosCoin[];
  allTime: CosmosCoin[];
}

export interface Pool {
  _docId: string;
  poolId: string;
  collectionId: string;
  address: string;
  allAssetDenoms: string[];
  asset1: string;
  asset2: string;
  poolParams?: {
    swapFee: string;
    exitFee: string;
  };
  volume: PoolVolume;
  lastVolumeUpdate: number;
  liquidity: CosmosCoin[];
  lastLiquidityUpdate: number;
  totalShares: string;
}

export interface PoolsResponse {
  pools: Pool[];
  pagination?: {
    bookmark?: string;
    hasMore: boolean;
  };
}

export interface PoolByIdResponse {
  success: boolean;
  poolInfo: any;
}

// ============================================================================
// Swap History
// ============================================================================

export interface SwapHistoryEntry {
  id: string;
  timestamp: number;
  tokenIn: string;
  tokenInDenom: string;
  tokenOut: string;
  tokenOutDenom: string;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
  chainId: string;
}

// ============================================================================
// Context
// ============================================================================

export interface SwapContextValue {
  apiUrl: string;
  client: import('../api/client').BitBadgesSwapClient;
  walletAdapter: WalletAdapter | null;
  address: string | null;
  isConnected: boolean;
  assets: Asset[];
  assetsLoading: boolean;
  theme: string;
  complianceMode: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

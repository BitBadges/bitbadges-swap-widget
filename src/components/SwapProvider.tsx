import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { BitBadgesSwapClient } from '../api/client';
import type { SwapContextValue, WalletAdapter, Asset, WalletConfig } from '../types';

const SwapContext = createContext<SwapContextValue | null>(null);

export function useSwapContext(): SwapContextValue {
  const ctx = useContext(SwapContext);
  if (!ctx) {
    throw new Error('useSwapContext must be used within a <SwapProvider>');
  }
  return ctx;
}

interface SwapProviderProps {
  apiUrl?: string;
  walletAdapter?: WalletAdapter | null;
  walletConfig?: WalletConfig;
  theme?: string;
  complianceMode?: boolean;
  children: React.ReactNode;
}

export function SwapProvider({
  apiUrl = 'https://api.bitbadges.io',
  walletAdapter: externalAdapter = null,
  walletConfig: _walletConfig,
  theme = 'dark',
  complianceMode = false,
  children,
}: SwapProviderProps) {
  const client = useMemo(() => new BitBadgesSwapClient(apiUrl), [apiUrl]);

  const [adapter, setAdapter] = useState<WalletAdapter | null>(externalAdapter);
  const [address, setAddress] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Sync external adapter
  useEffect(() => {
    setAdapter(externalAdapter);
  }, [externalAdapter]);

  // Fetch assets once
  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    client
      .getAssets()
      .then((result) => {
        if (!cancelled) setAssets(result);
      })
      .catch(() => {
        // Silently fail — user can retry via hook
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  // Watch wallet connection state
  useEffect(() => {
    if (adapter?.isConnected) {
      adapter.getAddress().then(setAddress).catch(() => setAddress(null));
    } else {
      setAddress(null);
    }
  }, [adapter, adapter?.isConnected]);

  const connectWallet = useCallback(async () => {
    if (!adapter) {
      throw new Error('No wallet adapter configured');
    }
    await adapter.connect();
    const addr = await adapter.getAddress();
    setAddress(addr);
  }, [adapter]);

  const disconnectWallet = useCallback(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    setAddress(null);
  }, [adapter]);

  const value: SwapContextValue = useMemo(
    () => ({
      apiUrl,
      client,
      walletAdapter: adapter,
      address,
      isConnected: adapter?.isConnected ?? false,
      assets,
      assetsLoading,
      theme,
      complianceMode,
      connectWallet,
      disconnectWallet,
    }),
    [apiUrl, client, adapter, address, assets, assetsLoading, theme, complianceMode, connectWallet, disconnectWallet]
  );

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>;
}

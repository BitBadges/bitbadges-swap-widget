import React, { useState, useCallback, useEffect } from 'react';
import { SwapProvider, useSwapContext } from './SwapProvider';
import { AssetSelector } from './AssetSelector';
import { AmountInput } from './AmountInput';
import { RouteDisplay } from './RouteDisplay';
import { SlippageSettings } from './SlippageSettings';
import { SwapButton } from './SwapButton';
import { SwapHistory } from './SwapHistory';
import { ComplianceWarning } from './ComplianceWarning';
import { WalletConnect } from './WalletConnect';
import { useSwapEstimate } from '../hooks/useSwapEstimate';
import { useSwapExecute } from '../hooks/useSwapExecute';
import { useSwapHistory } from '../hooks/useSwapHistory';
import type { BitBadgesSwapProps, Asset } from '../types';
import '../styles/theme.css';

/**
 * Main swap widget component.
 * Wraps all sub-components in a SwapProvider and renders the full swap UI.
 */
export function BitBadgesSwap(props: BitBadgesSwapProps) {
  const {
    apiUrl,
    theme = 'dark',
    complianceMode = false,
    walletAdapter,
    walletConfig,
    ...rest
  } = props;

  const themeAttr = theme === 'dark' || theme === 'light' ? theme : undefined;
  const customClass = theme !== 'dark' && theme !== 'light' ? theme : undefined;

  return (
    <SwapProvider
      apiUrl={apiUrl}
      walletAdapter={walletAdapter}
      walletConfig={walletConfig}
      theme={theme}
      complianceMode={complianceMode}
    >
      <div
        className={`bitbadges-swap ${customClass || ''}`}
        data-theme={themeAttr}
      >
        <SwapWidgetInner {...rest} />
      </div>
    </SwapProvider>
  );
}

/**
 * Inner component that has access to SwapContext.
 */
function SwapWidgetInner({
  defaultSourceDenom,
  defaultDestDenom,
  onSwapComplete,
  onError,
}: Pick<BitBadgesSwapProps, 'defaultSourceDenom' | 'defaultDestDenom' | 'onSwapComplete' | 'onError'>) {
  const {
    client,
    walletAdapter,
    address,
    isConnected,
    assets,
    assetsLoading,
    complianceMode,
    connectWallet,
    disconnectWallet,
  } = useSwapContext();

  // Local state
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [destAsset, setDestAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1');

  // Set defaults once assets load
  useEffect(() => {
    if (assets.length > 0 && !sourceAsset && defaultSourceDenom) {
      const found = assets.find((a) => a.denom === defaultSourceDenom);
      if (found) setSourceAsset(found);
    }
    if (assets.length > 0 && !destAsset && defaultDestDenom) {
      const found = assets.find((a) => a.denom === defaultDestDenom);
      if (found) setDestAsset(found);
    }
  }, [assets, defaultSourceDenom, defaultDestDenom, sourceAsset, destAsset]);

  // Hooks
  const {
    estimate,
    isLoading: isEstimating,
    error: estimateError,
    fetchEstimate,
    clear: clearEstimate,
  } = useSwapEstimate({ client });

  const {
    executeSwap,
    isExecuting,
    error: executeError,
  } = useSwapExecute({
    walletAdapter,
    onSwapComplete,
    onError,
  });

  const { history, addEntry, updateStatus, clearHistory } = useSwapHistory();

  // Trigger estimate when inputs change
  useEffect(() => {
    if (!sourceAsset || !destAsset || !amount || parseFloat(amount) <= 0) {
      clearEstimate();
      return;
    }

    const chainId = sourceAsset.chainId || 'bitbadges-1';

    fetchEstimate({
      tokenIn: `${amount}${sourceAsset.denom}`,
      tokenOutDenom: destAsset.denom,
      tokenInChainId: sourceAsset.chainId,
      tokenOutChainId: destAsset.chainId,
      chainIdsToAddresses: address ? { [chainId]: address } : {},
      slippageTolerancePercent: slippage,
    });
  }, [sourceAsset, destAsset, amount, slippage, address, fetchEstimate, clearEstimate]);

  // Swap source and dest
  const handleFlip = useCallback(() => {
    setSourceAsset(destAsset);
    setDestAsset(sourceAsset);
    setAmount('');
    clearEstimate();
  }, [sourceAsset, destAsset, clearEstimate]);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!estimate || !sourceAsset || !destAsset) return;

    const entry = addEntry({
      tokenIn: amount,
      tokenInDenom: sourceAsset.symbol || sourceAsset.denom,
      tokenOut: estimate.estimate.tokenOutAmount,
      tokenOutDenom: destAsset.symbol || destAsset.denom,
      status: 'pending',
      chainId: sourceAsset.chainId || 'bitbadges-1',
    });

    const txHash = await executeSwap(estimate);
    if (txHash) {
      updateStatus(entry.id, 'success', txHash);
    } else {
      updateStatus(entry.id, 'failed');
    }
  }, [estimate, sourceAsset, destAsset, amount, executeSwap, addEntry, updateStatus]);

  const currentError = estimateError || executeError;
  const hasAmount = !!amount && parseFloat(amount) > 0;

  return (
    <>
      <div className="bb-swap-header">
        <h3 className="bb-swap-header__title">Swap</h3>
        <div className="bb-swap-header__actions">
          <SlippageSettings value={slippage} onChange={setSlippage} />
          <WalletConnect
            isConnected={isConnected}
            address={address}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        </div>
      </div>

      <div className="bb-swap-body">
        {/* Source */}
        <div className="bb-swap-panel">
          <AssetSelector
            assets={assets}
            selectedDenom={sourceAsset?.denom}
            onSelect={setSourceAsset}
            label="From"
            isLoading={assetsLoading}
          />
          <AmountInput
            value={amount}
            onChange={setAmount}
            denomSymbol={sourceAsset?.symbol}
            label="Amount"
          />
        </div>

        {/* Flip button */}
        <button
          type="button"
          className="bb-swap-flip"
          onClick={handleFlip}
          aria-label="Switch tokens"
        >
          {'\u21C5'}
        </button>

        {/* Destination */}
        <div className="bb-swap-panel">
          <AssetSelector
            assets={assets}
            selectedDenom={destAsset?.denom}
            onSelect={setDestAsset}
            label="To"
            isLoading={assetsLoading}
          />
          <AmountInput
            value=""
            onChange={() => {}}
            estimatedOutput={estimate?.estimate.tokenOutAmount}
            denomSymbol={destAsset?.symbol}
            label="You receive"
            isOutput
          />
        </div>

        {/* Route */}
        <RouteDisplay estimate={estimate} isLoading={isEstimating} />

        {/* Compliance warning */}
        <ComplianceWarning estimate={estimate} complianceMode={complianceMode} />

        {/* Swap button */}
        <SwapButton
          estimate={estimate}
          isConnected={isConnected}
          isEstimating={isEstimating}
          isExecuting={isExecuting}
          hasAmount={hasAmount}
          onConnect={connectWallet}
          onSwap={handleSwap}
          error={currentError}
        />
      </div>

      {/* History */}
      <SwapHistory history={history} onClear={clearHistory} />
    </>
  );
}

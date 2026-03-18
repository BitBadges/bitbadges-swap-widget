import React from 'react';
import type { SwapEstimateResponse } from '../types';

interface SwapButtonProps {
  estimate: SwapEstimateResponse | null;
  isConnected: boolean;
  isEstimating: boolean;
  isExecuting: boolean;
  hasAmount: boolean;
  onConnect: () => void;
  onSwap: () => void;
  error?: Error | null;
}

export function SwapButton({
  estimate,
  isConnected,
  isEstimating,
  isExecuting,
  hasAmount,
  onConnect,
  onSwap,
  error,
}: SwapButtonProps) {
  // Determine button state and label
  let label: string;
  let disabled: boolean;
  let onClick: () => void;
  let variant: 'primary' | 'connect' | 'disabled' | 'error' = 'primary';

  if (!isConnected) {
    label = 'Connect Wallet';
    disabled = false;
    onClick = onConnect;
    variant = 'connect';
  } else if (isExecuting) {
    label = 'Swapping...';
    disabled = true;
    onClick = () => {};
  } else if (isEstimating) {
    label = 'Estimating...';
    disabled = true;
    onClick = () => {};
  } else if (error) {
    label = 'Swap Error';
    disabled = true;
    onClick = () => {};
    variant = 'error';
  } else if (!hasAmount) {
    label = 'Enter an amount';
    disabled = true;
    onClick = () => {};
    variant = 'disabled';
  } else if (!estimate) {
    label = 'Get Estimate First';
    disabled = true;
    onClick = () => {};
    variant = 'disabled';
  } else if (estimate.estimate.complianceNotPassedWarning) {
    label = 'Compliance Check Failed';
    disabled = true;
    onClick = () => {};
    variant = 'error';
  } else {
    label = 'Swap';
    disabled = false;
    onClick = onSwap;
  }

  return (
    <div className="bb-swap-button">
      <button
        type="button"
        className={`bb-swap-button__btn bb-swap-button__btn--${variant}`}
        disabled={disabled}
        onClick={onClick}
      >
        {(isExecuting || isEstimating) && (
          <span className="bb-swap-button__spinner" aria-hidden="true" />
        )}
        {label}
      </button>

      {error && (
        <div className="bb-swap-button__error" role="alert">
          {error.message}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { AssetPathStep, SwapEstimateResponse } from '../types';

interface RouteDisplayProps {
  estimate: SwapEstimateResponse | null;
  isLoading?: boolean;
}

const HOW_LABELS: Record<string, string> = {
  genesis: 'Origin',
  swap: 'Swap',
  transfer: 'Transfer',
};

export function RouteDisplay({ estimate, isLoading = false }: RouteDisplayProps) {
  if (isLoading) {
    return (
      <div className="bb-route-display bb-route-display--loading">
        <span className="bb-route-display__loading-text">Finding best route...</span>
      </div>
    );
  }

  if (!estimate) return null;

  const { assetPath, estimatedTime, lowLiquidityWarning } = estimate.estimate;

  if (!assetPath || assetPath.length === 0) return null;

  return (
    <div className="bb-route-display">
      <div className="bb-route-display__header">
        <span className="bb-route-display__title">Route</span>
        {estimatedTime != null && (
          <span className="bb-route-display__time">
            ~{estimatedTime < 60 ? `${estimatedTime}s` : `${Math.ceil(estimatedTime / 60)}m`}
          </span>
        )}
      </div>

      <div className="bb-route-display__path">
        {assetPath.map((step: AssetPathStep, i: number) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="bb-route-display__arrow">{'\u2192'}</span>}
            <div className="bb-route-display__step">
              <span className="bb-route-display__denom">{formatDenom(step.denom)}</span>
              <span className="bb-route-display__how">{HOW_LABELS[step.how] || step.how}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="bb-route-display__details">
        <div className="bb-route-display__row">
          <span>Min received</span>
          <span>{estimate.estimate.tokenOutAmount}</span>
        </div>
      </div>

      {lowLiquidityWarning && (
        <div className="bb-route-display__warning">
          Low liquidity - price impact may be high
        </div>
      )}
    </div>
  );
}

function formatDenom(denom: string): string {
  // Shorten IBC denoms and long contract addresses
  if (denom.startsWith('ibc/')) {
    return `IBC...${denom.slice(-6)}`;
  }
  if (denom.startsWith('0x') && denom.length > 12) {
    return `${denom.slice(0, 6)}...${denom.slice(-4)}`;
  }
  // Remove common prefixes for readability
  if (denom.startsWith('u') && denom.length <= 10) {
    return denom;
  }
  return denom.length > 16 ? `${denom.slice(0, 12)}...` : denom;
}

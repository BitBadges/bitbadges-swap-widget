import React from 'react';
import type { SwapHistoryEntry } from '../types';

interface SwapHistoryProps {
  history: SwapHistoryEntry[];
  onClear: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  success: 'Success',
  failed: 'Failed',
};

export function SwapHistory({ history, onClear }: SwapHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="bb-swap-history">
      <div className="bb-swap-history__header">
        <span className="bb-swap-history__title">Recent Swaps</span>
        <button
          type="button"
          className="bb-swap-history__clear"
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div className="bb-swap-history__list">
        {history.slice(0, 10).map((entry) => (
          <div key={entry.id} className="bb-swap-history__item">
            <div className="bb-swap-history__pair">
              <span>{entry.tokenIn} {entry.tokenInDenom}</span>
              <span className="bb-swap-history__arrow">{'\u2192'}</span>
              <span>{entry.tokenOut} {entry.tokenOutDenom}</span>
            </div>

            <div className="bb-swap-history__meta">
              <span
                className={`bb-swap-history__status bb-swap-history__status--${entry.status}`}
              >
                {STATUS_LABELS[entry.status] || entry.status}
              </span>
              <span className="bb-swap-history__time">
                {formatTimeAgo(entry.timestamp)}
              </span>
            </div>

            {entry.txHash && (
              <span className="bb-swap-history__hash" title={entry.txHash}>
                {entry.txHash.slice(0, 8)}...{entry.txHash.slice(-6)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

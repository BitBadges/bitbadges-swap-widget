import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SwapButton } from '../../src/components/SwapButton';

const mockEstimate = {
  success: true,
  estimate: {
    tokenOutAmount: '1000000',
    tokenInAmount: '500000',
    skipGoMsgs: [],
    assetPath: [],
    doesSwap: true,
  },
};

describe('SwapButton', () => {
  it('should show "Connect Wallet" when not connected', () => {
    render(
      <SwapButton
        estimate={null}
        isConnected={false}
        isEstimating={false}
        isExecuting={false}
        hasAmount={false}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('should call onConnect when wallet button is clicked', () => {
    const onConnect = vi.fn();
    render(
      <SwapButton
        estimate={null}
        isConnected={false}
        isEstimating={false}
        isExecuting={false}
        hasAmount={false}
        onConnect={onConnect}
        onSwap={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Connect Wallet'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('should show "Enter an amount" when connected but no amount', () => {
    render(
      <SwapButton
        estimate={null}
        isConnected={true}
        isEstimating={false}
        isExecuting={false}
        hasAmount={false}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    expect(screen.getByText('Enter an amount')).toBeInTheDocument();
  });

  it('should show "Estimating..." while loading', () => {
    render(
      <SwapButton
        estimate={null}
        isConnected={true}
        isEstimating={true}
        isExecuting={false}
        hasAmount={true}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    expect(screen.getByText('Estimating...')).toBeInTheDocument();
  });

  it('should show "Swapping..." while executing', () => {
    render(
      <SwapButton
        estimate={mockEstimate}
        isConnected={true}
        isEstimating={false}
        isExecuting={true}
        hasAmount={true}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    expect(screen.getByText('Swapping...')).toBeInTheDocument();
  });

  it('should show "Swap" and be clickable when ready', () => {
    const onSwap = vi.fn();
    render(
      <SwapButton
        estimate={mockEstimate}
        isConnected={true}
        isEstimating={false}
        isExecuting={false}
        hasAmount={true}
        onConnect={vi.fn()}
        onSwap={onSwap}
      />
    );

    const button = screen.getByText('Swap');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('should show error message when error prop is set', () => {
    render(
      <SwapButton
        estimate={null}
        isConnected={true}
        isEstimating={false}
        isExecuting={false}
        hasAmount={true}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
        error={new Error('Insufficient liquidity')}
      />
    );
    expect(screen.getByText('Insufficient liquidity')).toBeInTheDocument();
  });

  it('should show compliance error when estimate has compliance warning', () => {
    const complianceEstimate = {
      ...mockEstimate,
      estimate: {
        ...mockEstimate.estimate,
        complianceNotPassedWarning: true,
      },
    };
    render(
      <SwapButton
        estimate={complianceEstimate}
        isConnected={true}
        isEstimating={false}
        isExecuting={false}
        hasAmount={true}
        onConnect={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    expect(screen.getByText('Compliance Check Failed')).toBeInTheDocument();
  });
});

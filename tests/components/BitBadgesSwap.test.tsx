import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BitBadgesSwap } from '../../src/components/BitBadgesSwap';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('BitBadgesSwap', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Mock the assets fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ chain_to_assets_map: {} }),
    });
  });

  it('should render the swap widget', async () => {
    render(<BitBadgesSwap />);
    await waitFor(() => {
      expect(screen.getByText('Swap')).toBeInTheDocument();
    });
  });

  it('should render with dark theme by default', async () => {
    const { container } = render(<BitBadgesSwap />);
    await waitFor(() => {
      const widget = container.querySelector('.bitbadges-swap');
      expect(widget).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('should render with light theme', async () => {
    const { container } = render(<BitBadgesSwap theme="light" />);
    await waitFor(() => {
      const widget = container.querySelector('.bitbadges-swap');
      expect(widget).toHaveAttribute('data-theme', 'light');
    });
  });

  it('should render connect wallet button when not connected', async () => {
    render(<BitBadgesSwap />);
    await waitFor(() => {
      // Both WalletConnect and SwapButton show "Connect Wallet" — use getAllByText
      const buttons = screen.getAllByText('Connect Wallet');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render with custom CSS class for custom theme', async () => {
    const { container } = render(<BitBadgesSwap theme="my-custom-theme" />);
    await waitFor(() => {
      const widget = container.querySelector('.bitbadges-swap');
      expect(widget?.classList.contains('my-custom-theme')).toBe(true);
      expect(widget).not.toHaveAttribute('data-theme');
    });
  });

  it('should show From and To labels', async () => {
    render(<BitBadgesSwap />);
    await waitFor(() => {
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });
  });
});

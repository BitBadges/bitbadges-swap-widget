import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AssetSelector } from '../../src/components/AssetSelector';
import type { Asset } from '../../src/types';

const mockAssets: Asset[] = [
  { denom: 'abadge', chainId: 'bitbadges-1', symbol: 'BADGE', name: 'BitBadges', decimals: 18 },
  { denom: 'uosmo', chainId: 'osmosis-1', symbol: 'OSMO', name: 'Osmosis', decimals: 6 },
  { denom: 'uatom', chainId: 'cosmoshub-4', symbol: 'ATOM', name: 'Cosmos Hub', decimals: 6 },
];

describe('AssetSelector', () => {
  it('should render with placeholder text', () => {
    render(<AssetSelector assets={mockAssets} onSelect={vi.fn()} />);
    // Both the label and the placeholder use "Select token" by default
    const elements = screen.getAllByText('Select token');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show selected asset', () => {
    render(
      <AssetSelector assets={mockAssets} selectedDenom="abadge" onSelect={vi.fn()} />
    );
    expect(screen.getByText('BADGE')).toBeInTheDocument();
  });

  it('should open dropdown on click', async () => {
    render(<AssetSelector assets={mockAssets} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByPlaceholderText('Search tokens...')).toBeInTheDocument();
    expect(screen.getByText('OSMO')).toBeInTheDocument();
    expect(screen.getByText('ATOM')).toBeInTheDocument();
  });

  it('should filter assets by search', async () => {
    const user = userEvent.setup();
    render(<AssetSelector assets={mockAssets} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    const searchInput = screen.getByPlaceholderText('Search tokens...');
    await user.type(searchInput, 'badge');

    expect(screen.getByText('BADGE')).toBeInTheDocument();
    // 'badge' should not match OSMO or ATOM
    expect(screen.queryByText('OSMO')).not.toBeInTheDocument();
    expect(screen.queryByText('ATOM')).not.toBeInTheDocument();
  });

  it('should call onSelect when an asset is clicked', async () => {
    const onSelect = vi.fn();
    render(<AssetSelector assets={mockAssets} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByText('OSMO'));

    expect(onSelect).toHaveBeenCalledWith(mockAssets[1]);
  });

  it('should show loading state', () => {
    render(
      <AssetSelector assets={[]} onSelect={vi.fn()} isLoading={true} />
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty state when no results', async () => {
    const user = userEvent.setup();
    render(<AssetSelector assets={mockAssets} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    const searchInput = screen.getByPlaceholderText('Search tokens...');
    await user.type(searchInput, 'zzzzz');

    expect(screen.getByText('No tokens found')).toBeInTheDocument();
  });
});

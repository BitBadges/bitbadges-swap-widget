import React, { useState, useRef, useEffect } from 'react';
import type { Asset } from '../types';

interface AssetSelectorProps {
  assets: Asset[];
  selectedDenom?: string;
  onSelect: (asset: Asset) => void;
  label?: string;
  isLoading?: boolean;
}

export function AssetSelector({
  assets,
  selectedDenom,
  onSelect,
  label = 'Select token',
  isLoading = false,
}: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = assets.find((a) => a.denom === selectedDenom);

  const filtered = search.trim()
    ? assets.filter((a) => {
        const q = search.toLowerCase();
        return (
          a.denom.toLowerCase().includes(q) ||
          (a.symbol && a.symbol.toLowerCase().includes(q)) ||
          (a.name && a.name.toLowerCase().includes(q))
        );
      })
    : assets;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="bb-asset-selector" ref={dropdownRef}>
      {label && <label className="bb-asset-selector__label">{label}</label>}

      <button
        type="button"
        className="bb-asset-selector__trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <span className="bb-asset-selector__loading">Loading...</span>
        ) : selected ? (
          <span className="bb-asset-selector__selected">
            {selected.logoUri && (
              <img
                src={selected.logoUri}
                alt=""
                className="bb-asset-selector__icon"
                width={20}
                height={20}
              />
            )}
            <span>{selected.symbol || selected.denom}</span>
          </span>
        ) : (
          <span className="bb-asset-selector__placeholder">Select token</span>
        )}
        <span className="bb-asset-selector__chevron" aria-hidden="true">
          {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {isOpen && (
        <div className="bb-asset-selector__dropdown" role="listbox">
          <input
            className="bb-asset-selector__search"
            type="text"
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="bb-asset-selector__list">
            {filtered.length === 0 ? (
              <div className="bb-asset-selector__empty">No tokens found</div>
            ) : (
              filtered.slice(0, 100).map((asset) => (
                <button
                  key={`${asset.chainId}-${asset.denom}`}
                  type="button"
                  className={`bb-asset-selector__item ${
                    asset.denom === selectedDenom ? 'bb-asset-selector__item--active' : ''
                  }`}
                  role="option"
                  aria-selected={asset.denom === selectedDenom}
                  onClick={() => {
                    onSelect(asset);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {asset.logoUri && (
                    <img
                      src={asset.logoUri}
                      alt=""
                      className="bb-asset-selector__icon"
                      width={20}
                      height={20}
                    />
                  )}
                  <div className="bb-asset-selector__info">
                    <span className="bb-asset-selector__symbol">
                      {asset.symbol || asset.denom}
                    </span>
                    {asset.name && (
                      <span className="bb-asset-selector__name">{asset.name}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

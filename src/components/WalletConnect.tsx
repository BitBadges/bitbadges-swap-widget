import React from 'react';

interface WalletConnectProps {
  isConnected: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

export function WalletConnect({
  isConnected,
  address,
  onConnect,
  onDisconnect,
  isLoading = false,
}: WalletConnectProps) {
  if (isConnected && address) {
    return (
      <div className="bb-wallet-connect bb-wallet-connect--connected">
        <span className="bb-wallet-connect__address" title={address}>
          {address.slice(0, 10)}...{address.slice(-6)}
        </span>
        <button
          type="button"
          className="bb-wallet-connect__disconnect"
          onClick={onDisconnect}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bb-wallet-connect">
      <button
        type="button"
        className="bb-wallet-connect__btn"
        onClick={onConnect}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}

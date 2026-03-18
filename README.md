# bitbadges-swap-widget

A standalone, exportable React swap widget for the BitBadges DEX. Supports token swaps on BitBadges liquidity pools with cross-chain routing via Skip API.

## Installation

```bash
npm install bitbadges-swap-widget
```

**Peer dependencies:** `react` (>=17), `react-dom` (>=17)

## Quick Start

```tsx
import { BitBadgesSwap } from 'bitbadges-swap-widget';
import 'bitbadges-swap-widget/styles';

function App() {
  return (
    <BitBadgesSwap
      apiUrl="https://api.bitbadges.io"
      defaultSourceDenom="ubadge"
      defaultDestDenom="uosmo"
      theme="dark"
      onSwapComplete={(txHash) => console.log('Swap complete:', txHash)}
      onError={(err) => console.error('Swap error:', err)}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | `https://api.bitbadges.io` | BitBadges indexer API URL |
| `defaultSourceDenom` | `string` | — | Default source token denom |
| `defaultDestDenom` | `string` | — | Default destination token denom |
| `theme` | `'dark' \| 'light' \| string` | `'dark'` | Theme mode or custom CSS class |
| `onSwapComplete` | `(txHash: string) => void` | — | Callback after successful swap |
| `onError` | `(error: Error) => void` | — | Error callback |
| `complianceMode` | `boolean` | `false` | Show transfer restriction warnings |
| `walletAdapter` | `WalletAdapter` | — | Custom wallet adapter |
| `walletConfig` | `WalletConfig` | — | Wallet connection config |

## Theming

The widget uses CSS custom properties for styling. Override them with your own values:

```css
.bitbadges-swap {
  --bb-bg-primary: #030712;
  --bb-bg-secondary: #111827;
  --bb-text-primary: #f9fafb;
  --bb-text-secondary: #9ca3af;
  --bb-accent: #02ADEE;
  --bb-accent-secondary: #EB018C;
  --bb-border: #1f2937;
  --bb-error: #ef4444;
  --bb-success: #22c55e;
  --bb-radius: 12px;
}
```

Use `theme="light"` for the built-in light theme, or pass a custom CSS class name.

## Hooks (for Custom UIs)

Build your own swap UI using the provided hooks:

```tsx
import {
  useSwapEstimate,
  useAssetList,
  usePoolInfo,
  useSwapExecute,
  useSwapHistory,
  BitBadgesSwapClient,
} from 'bitbadges-swap-widget';

const client = new BitBadgesSwapClient('https://api.bitbadges.io');

function MyCustomSwap() {
  const { assets, filteredAssets, setSearchQuery } = useAssetList({ client });
  const { estimate, fetchEstimate, isLoading } = useSwapEstimate({ client });
  const { pools } = usePoolInfo({ client, fetchAll: true });
  const { executeSwap, isExecuting } = useSwapExecute({ walletAdapter: myAdapter });
  const { history, addEntry } = useSwapHistory();

  // Build your own UI...
}
```

## API Client (Standalone)

Use the API client without React:

```ts
import { BitBadgesSwapClient } from 'bitbadges-swap-widget';

const client = new BitBadgesSwapClient('https://api.bitbadges.io');

const estimate = await client.getSwapEstimate({
  tokenIn: '1000000ubadge',
  tokenOutDenom: 'uosmo',
  chainIdsToAddresses: { 'bitbadges-1': 'bb1...' },
  slippageTolerancePercent: '1',
});

const assets = await client.getAssets();
const pools = await client.getPools({ sortBy: 'liquidity' });
```

## Wallet Adapter

Implement the `WalletAdapter` interface for custom wallet integrations:

```ts
interface WalletAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  signAndBroadcast(msgs: any[], fee: any): Promise<string>;
  isConnected: boolean;
}
```

## Development

```bash
npm install
npm run build      # Build CJS + ESM + types
npm run test       # Run tests
npm run dev        # Watch mode
npm run storybook  # Visual component development
```

## License

MIT

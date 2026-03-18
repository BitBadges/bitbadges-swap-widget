import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwapHistory } from '../../src/hooks/useSwapHistory';

describe('useSwapHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should start with empty history', () => {
    const { result } = renderHook(() => useSwapHistory());
    expect(result.current.history).toEqual([]);
  });

  it('should add an entry', () => {
    const { result } = renderHook(() => useSwapHistory());

    act(() => {
      result.current.addEntry({
        tokenIn: '1000000',
        tokenInDenom: 'BADGE',
        tokenOut: '500000',
        tokenOutDenom: 'OSMO',
        status: 'pending',
        chainId: 'bitbadges-1',
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].tokenInDenom).toBe('BADGE');
    expect(result.current.history[0].status).toBe('pending');
    expect(result.current.history[0].id).toBeTruthy();
    expect(result.current.history[0].timestamp).toBeGreaterThan(0);
  });

  it('should update entry status', () => {
    const { result } = renderHook(() => useSwapHistory());
    let entryId: string;

    act(() => {
      const entry = result.current.addEntry({
        tokenIn: '1000000',
        tokenInDenom: 'BADGE',
        tokenOut: '500000',
        tokenOutDenom: 'OSMO',
        status: 'pending',
        chainId: 'bitbadges-1',
      });
      entryId = entry.id;
    });

    act(() => {
      result.current.updateStatus(entryId!, 'success', '0xabc123');
    });

    expect(result.current.history[0].status).toBe('success');
    expect(result.current.history[0].txHash).toBe('0xabc123');
  });

  it('should remove an entry', () => {
    const { result } = renderHook(() => useSwapHistory());
    let entryId: string;

    act(() => {
      const entry = result.current.addEntry({
        tokenIn: '1000000',
        tokenInDenom: 'BADGE',
        tokenOut: '500000',
        tokenOutDenom: 'OSMO',
        status: 'success',
        chainId: 'bitbadges-1',
      });
      entryId = entry.id;
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.removeEntry(entryId!);
    });

    expect(result.current.history).toHaveLength(0);
  });

  it('should clear all history', () => {
    const { result } = renderHook(() => useSwapHistory());

    act(() => {
      result.current.addEntry({
        tokenIn: '1', tokenInDenom: 'A', tokenOut: '2', tokenOutDenom: 'B',
        status: 'success', chainId: 'x',
      });
      result.current.addEntry({
        tokenIn: '3', tokenInDenom: 'C', tokenOut: '4', tokenOutDenom: 'D',
        status: 'pending', chainId: 'y',
      });
    });

    expect(result.current.history).toHaveLength(2);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toHaveLength(0);
  });

  it('should persist to localStorage', () => {
    const { result } = renderHook(() => useSwapHistory());

    act(() => {
      result.current.addEntry({
        tokenIn: '1000',
        tokenInDenom: 'BADGE',
        tokenOut: '500',
        tokenOutDenom: 'OSMO',
        status: 'success',
        chainId: 'bitbadges-1',
      });
    });

    const stored = JSON.parse(localStorage.getItem('bitbadges-swap-history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenInDenom).toBe('BADGE');
  });
});

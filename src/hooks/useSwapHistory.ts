import { useState, useCallback, useEffect } from 'react';
import type { SwapHistoryEntry } from '../types';

const STORAGE_KEY = 'bitbadges-swap-history';
const MAX_ENTRIES = 50;

interface UseSwapHistoryReturn {
  history: SwapHistoryEntry[];
  /** Add a new swap entry */
  addEntry: (entry: Omit<SwapHistoryEntry, 'id' | 'timestamp'>) => SwapHistoryEntry;
  /** Update the status of an entry by ID */
  updateStatus: (id: string, status: SwapHistoryEntry['status'], txHash?: string) => void;
  /** Remove a single entry */
  removeEntry: (id: string) => void;
  /** Clear all history */
  clearHistory: () => void;
}

function loadHistory(): SwapHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SwapHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: SwapHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable (SSR, quota exceeded)
  }
}

export function useSwapHistory(): UseSwapHistoryReturn {
  const [history, setHistory] = useState<SwapHistoryEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const persist = useCallback((entries: SwapHistoryEntry[]) => {
    setHistory(entries);
    saveHistory(entries);
  }, []);

  const addEntry = useCallback(
    (entry: Omit<SwapHistoryEntry, 'id' | 'timestamp'>): SwapHistoryEntry => {
      const newEntry: SwapHistoryEntry = {
        ...entry,
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      const updated = [newEntry, ...loadHistory()].slice(0, MAX_ENTRIES);
      persist(updated);
      return newEntry;
    },
    [persist]
  );

  const updateStatus = useCallback(
    (id: string, status: SwapHistoryEntry['status'], txHash?: string) => {
      const current = loadHistory();
      const updated = current.map((e) =>
        e.id === id ? { ...e, status, ...(txHash ? { txHash } : {}) } : e
      );
      persist(updated);
    },
    [persist]
  );

  const removeEntry = useCallback(
    (id: string) => {
      const updated = loadHistory().filter((e) => e.id !== id);
      persist(updated);
    },
    [persist]
  );

  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  return { history, addEntry, updateStatus, removeEntry, clearHistory };
}

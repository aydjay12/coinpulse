'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';

type ToggleWatchlistResponse = {
  success: boolean;
  message?: string;
  coinId?: string;
  isWatched?: boolean;
  ids?: string[];
};

type WatchlistIdsResponse = {
  success: boolean;
  message?: string;
  ids?: string[];
};

type WatchlistContextValue = {
  watchlistIds: string[];
  isLoading: boolean;
  isWatched: (coinId: string) => boolean;
  toggleCoin: (coinId: string, shouldWatch?: boolean) => Promise<boolean>;
  refreshWatchlist: () => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}

async function watchlistRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api/watchlist${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({ success: response.ok }))) as T & {
    success?: boolean;
    message?: string;
  };

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Watchlist request failed');
  }

  return data;
}

function normalizeCoinId(coinId: string) {
  return coinId.trim().toLowerCase();
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestQueue = useRef<Promise<unknown>>(Promise.resolve());

  const refreshWatchlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWatchlistIds([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await watchlistRequest<WatchlistIdsResponse>('/ids');
      setWatchlistIds(data.ids ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWatchlist().catch(() => setWatchlistIds([]));
  }, [refreshWatchlist]);

  const isWatched = useCallback(
    (coinId: string) => watchlistIds.includes(normalizeCoinId(coinId)),
    [watchlistIds],
  );

  const toggleCoin = useCallback(
    async (coinId: string, shouldWatch?: boolean) => {
      const normalizedCoinId = normalizeCoinId(coinId);
      const previousIds = watchlistIds;
      const nextIsWatched =
        typeof shouldWatch === 'boolean' ? shouldWatch : !previousIds.includes(normalizedCoinId);

      // Optimistic update
      setWatchlistIds((currentIds) => {
        const nextIds = new Set(currentIds);
        if (nextIsWatched) {
          nextIds.add(normalizedCoinId);
        } else {
          nextIds.delete(normalizedCoinId);
        }
        return Array.from(nextIds);
      });

      // Chain the request to the queue to ensure serialization
      const promise = requestQueue.current.then(async () => {
        try {
          const data = await watchlistRequest<ToggleWatchlistResponse>('/toggle', {
            method: 'POST',
            body: JSON.stringify({ coinId: normalizedCoinId, shouldWatch: nextIsWatched }),
          });

          // Refresh the list from server to ensure sync, but only if this was the last request
          // Actually, setWatchlistIds(data.ids) is risky if we have more in queue.
          // Better to just trust the optimistic update and let the next queued request handle it.
          // Or only update if this is still the "current" view of the world.
          if (data.ids) {
            setWatchlistIds(data.ids);
          }
          return Boolean(data.isWatched);
        } catch (error) {
          // Revert on error
          setWatchlistIds(previousIds);
          throw error;
        }
      });

      requestQueue.current = promise.catch(() => {}); // catch to prevent blocking next in queue
      return promise;
    },
    [watchlistIds],
  );

  const value = useMemo(
    () => ({
      watchlistIds,
      isLoading,
      isWatched,
      toggleCoin,
      refreshWatchlist,
    }),
    [watchlistIds, isLoading, isWatched, toggleCoin, refreshWatchlist],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { cn, formatPercentage, formatCurrency } from '@/lib/utils';
import { Search, Star } from 'lucide-react';
import WatchlistStar from '@/components/WatchlistStar';
import ClientTable from '@/components/ClientTable';
import NavLink from '@/components/NavLink';
import { useWatchlist } from '@/context/WatchlistContext';
import RouteLoading from '@/components/RouteLoading';
import ErrorState from '@/components/ErrorState';
import '../coins/coins.css';
import '../dashboard/dashboard.css';

type WatchlistResponse = {
  success: boolean;
  message?: string;
  ids?: string[];
  coins?: CoinMarketData[];
};

export default function WatchlistPage() {
  const { refreshWatchlist } = useWatchlist();
  const [watchlist, setWatchlist] = useState<CoinMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/watchlist', {
          credentials: 'include',
          cache: 'no-store',
          signal,
        });
        const data = (await response.json()) as WatchlistResponse;

        if (!response.ok || data.success === false) {
          throw new Error(data.message || 'Failed to load watchlist');
        }

        setWatchlist(data.coins ?? []);
        refreshWatchlist();
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load watchlist');
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [refreshWatchlist],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadWatchlist(controller.signal);

    return () => controller.abort();
  }, [loadWatchlist]);

  const handleWatchlistChange = (coinId: string, isWatched: boolean) => {
    if (isWatched) return;
    setWatchlist((prev) => prev.filter((coin) => coin.id !== coinId));
  };

  const columns = [
    {
      header: '',
      cellClassName: 'star-cell',
      cell: (coin: CoinMarketData) => (
        <WatchlistStar
          coinId={coin.id}
          initialIsWatched
          onWatchlistChange={handleWatchlistChange}
        />
      ),
    },
    {
      header: 'Rank',
      cellClassName: 'rank-cell',
      cell: (coin: CoinMarketData) => <>#{coin.market_cap_rank}</>,
    },
    {
      header: 'Token',
      cellClassName: 'token-cell',
      cell: (coin: CoinMarketData) => (
        <div className="token-info">
          <Image
            src={coin.image}
            alt={coin.name}
            width={36}
            height={36}
            className="token-img-desktop"
          />
          <p>
            {coin.name} ({coin.symbol.toUpperCase()})
          </p>
        </div>
      ),
    },
    {
      header: 'Price',
      cellClassName: 'price-cell',
      cell: (coin: CoinMarketData) => formatCurrency(coin.current_price),
    },
    {
      header: '24h Change',
      cellClassName: 'change-cell',
      cell: (coin: CoinMarketData) => {
        const isUp = coin.price_change_percentage_24h > 0;
        return (
          <span className={cn('change-value', isUp ? 'text-green-500' : 'text-red-500')}>
            {isUp && '+'}
            {formatPercentage(coin.price_change_percentage_24h)}
          </span>
        );
      },
    },
    {
      header: 'Market Cap',
      cellClassName: 'market-cap-cell',
      cell: (coin: CoinMarketData) => formatCurrency(coin.market_cap),
    },
  ];

  if (isLoading) {
    return <RouteLoading />;
  }

  return (
    <main className="main-container py-8 lg:py-12">
      <div className="flex flex-col gap-2 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          Personal <span className="brand-gradient-text">Watchlist</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl font-medium">
          Track the digital assets you care about most in one place.
        </p>
      </div>

      {error ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center w-full">
          <ErrorState
            title="Watchlist Unavailable"
            message={error}
            onRetry={() => loadWatchlist()}
            className="w-full"
          />
        </div>
      ) : watchlist.length === 0 ? (
        <div className="glass-card rounded-3xl p-20 flex flex-col items-center text-center gap-6 neon-glow-purple animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="p-6 rounded-full bg-brand-purple/10 text-brand-purple">
            <Star size={48} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white">Your watchlist is empty</h2>
            <p className="text-muted-foreground max-w-sm">
              Start adding assets to your watchlist by clicking the star icon in the explorer or
              dashboard.
            </p>
          </div>
          <NavLink
            href="/coins"
            className="dash-btn dash-btn-primary"
            style={{ marginTop: '0.5rem', textDecoration: 'none' }}
          >
            <Search size={18} />
            <span>Explore Assets</span>
          </NavLink>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-0 overflow-hidden neon-glow-purple animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h4 className="saved-assets-header text-xl font-bold flex items-center gap-2">
              <span className="p-1.5 glass-card rounded-lg bg-brand-orange/10 text-brand-orange">
                <Star size={20} fill="currentColor" />
              </span>
              Saved Assets ({watchlist.length})
            </h4>
          </div>

          <ClientTable
            tableClassName="coins-table border-0"
            columns={columns}
            data={watchlist}
            rowKey={(coin) => coin.id}
            rowHref={(coin) => `/coins/${coin.id}`}
            rowAriaLabel={(coin) => `Open ${coin.name}`}
            headerCellClassName="bg-transparent!"
            bodyCellClassName="border-white/5"
          />
        </div>
      )}
    </main>
  );
}

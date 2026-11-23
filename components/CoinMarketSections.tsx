'use client';

import DataTable from '@/components/DataTable';
import { cn, formatCurrency, formatPercentage, formatUtcTimestamp, timeAgo } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import './LiveDataWrapper.css';

type CoinMarketSectionsProps = {
  coinId: string;
  topGainers: TopGainersLosers[];
  topLosers: TopGainersLosers[];
  fallbackTickers: Ticker[];
};

const CoinMarketSections = ({
  coinId,
  topGainers,
  topLosers,
  fallbackTickers,
}: CoinMarketSectionsProps) => {
  const [pollingTickers, setPollingTickers] = useState<Ticker[]>(fallbackTickers);
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'ready' | 'error'>(
    'idle',
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isDisposed = false;

    const fetchSnapshot = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      try {
        setPollingStatus((prev) => (prev === 'ready' ? prev : 'polling'));

        const response = await fetch(`/api/coins/${coinId}/snapshot`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load coin snapshot');
        }

        const payload = (await response.json()) as {
          tickers: Ticker[];
          fetchedAt: number;
        };

        if (isDisposed) return;

        setPollingTickers(payload.tickers ?? []);
        setLastPolledAt(payload.fetchedAt ?? Date.now());
        setPollingStatus('ready');
      } catch {
        if (!isDisposed) {
          setPollingStatus('error');
        }
      }
    };

    fetchSnapshot();

    const intervalId = window.setInterval(fetchSnapshot, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSnapshot();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coinId]);

  const activityTickers = pollingTickers.length ? pollingTickers : fallbackTickers;
  let activityDescription =
    'Exchange activity snapshot sourced from the latest available market data.';

  if (pollingStatus === 'error') {
    activityDescription =
      'Exchange activity is temporarily unavailable. Showing the latest cached market snapshot.';
  } else if (lastPolledAt) {
    const syncedAt = isMounted ? timeAgo(lastPolledAt) : formatUtcTimestamp(lastPolledAt);
    activityDescription = `Exchange activity synced ${syncedAt}.`;
  }

  const topMoverSections = [
    {
      title: 'Top Gainers',
      icon: <TrendingUp size={18} />,
      items: topGainers,
      positive: true,
    },
    {
      title: 'Top Losers',
      icon: <TrendingDown size={18} />,
      items: topLosers,
      positive: false,
    },
  ];

  const tickerColumns: DataTableColumn<Ticker>[] = [
    {
      header: 'Exchange',
      cell: (ticker) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{ticker.market.name}</span>
          <span className="exchange-description text-xs text-muted-foreground">
            {ticker.base}/{ticker.target}
          </span>
        </div>
      ),
    },
    {
      header: 'Pair Price',
      cell: (ticker) => formatCurrency(ticker.converted_last?.usd),
    },
    {
      header: 'Updated',
      cell: (ticker) =>
        isMounted ? timeAgo(ticker.timestamp) : formatUtcTimestamp(ticker.timestamp),
    },
    {
      header: 'Open',
      cell: (ticker) => (
        <Link
          href={ticker.trade_url}
          target="_blank"
          className="text-sm font-semibold text-brand-purple hover:text-white transition-colors"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <section className="coin-market-sections page-enter space-y-8 lg:space-y-10">
      <section className="movers-grid movers-grid-full">
        {topMoverSections.map((section) => (
          <div
            key={section.title}
            className="glass-card rounded-3xl p-6 neon-glow-blue movers-card"
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <h4 className="text-xl font-bold flex items-center gap-2">
                <span
                  className={cn(
                    'p-2 rounded-xl border',
                    section.positive
                      ? 'bg-green-500/10 text-green-500 border-green-500/15'
                      : 'bg-red-500/10 text-red-500 border-red-500/15',
                  )}
                >
                  {section.icon}
                </span>
                {section.title}
              </h4>
              <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                24h movers
              </span>
            </div>

            <div className="space-y-3">
              {section.items.length ? (
                section.items.map((item) => (
                  <Link key={item.id} href={`/coins/${item.id}`} className="mover-row">
                    <div className="mover-asset">
                      <Image src={item.image} alt={item.name} width={38} height={38} />
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground uppercase">{item.symbol}</p>
                      </div>
                    </div>

                    <div className="mover-metrics">
                      <p className="font-semibold text-foreground">{formatCurrency(item.price)}</p>
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          section.positive ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {section.positive && item.priceChangePercentage24h > 0 ? '+' : ''}
                        {formatPercentage(item.priceChangePercentage24h)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="movers-empty">No mover data available right now.</div>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="glass-card rounded-3xl p-0 overflow-hidden neon-glow-purple">
        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xl font-bold flex items-center gap-2">
              <span className="p-1.5 glass-card rounded-lg bg-brand-purple/10 text-brand-purple">
                <Activity size={20} />
              </span>
              Recent Trades
            </h4>
            <p className="text-sm text-muted-foreground mt-1">{activityDescription}</p>
          </div>
        </div>

        {activityTickers.length ? (
          <DataTable
            tableClassName="border-0"
            columns={tickerColumns}
            data={activityTickers}
            rowKey={(ticker, index) =>
              `${ticker.market.name}-${ticker.base}-${ticker.target}-${index}`
            }
            headerCellClassName="bg-transparent!"
            bodyCellClassName="border-white/5"
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Market activity data is currently unavailable for this asset.
          </div>
        )}
      </section>
    </section>
  );
};

export default CoinMarketSections;

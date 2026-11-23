'use client';

import CandlestickChart from '@/components/CandlestickChart';
import { useDeferredValue, useEffect, useState } from 'react';
import CoinHeader from '@/components/CoinHeader';
import './LiveDataWrapper.css';

const LiveDataWrapper = ({ coinId, coin, coinOHLCData }: LiveDataProps) => {
  const [liveInterval, setLiveInterval] = useState<'30s' | '60s'>('30s');
  const [pollingPrice, setPollingPrice] = useState(coin.market_data.current_price.usd);
  const [pollingPriceChangePercentage24h, setPollingPriceChangePercentage24h] = useState(
    coin.market_data.price_change_percentage_24h_in_currency.usd,
  );
  const [pollingPriceChangePercentage30d, setPollingPriceChangePercentage30d] = useState(
    coin.market_data.price_change_percentage_30d_in_currency.usd,
  );
  const [pollingPriceChange24h, setPollingPriceChange24h] = useState(
    coin.market_data.price_change_24h_in_currency.usd,
  );
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'ready' | 'error'>(
    'idle',
  );

  const deferredPrice = useDeferredValue(pollingPrice);

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
          price: number;
          priceChangePercentage24h: number;
          priceChangePercentage30d: number;
          priceChange24h: number;
        };

        if (isDisposed) return;

        setPollingPrice(payload.price);
        setPollingPriceChangePercentage24h(payload.priceChangePercentage24h);
        setPollingPriceChangePercentage30d(payload.priceChangePercentage30d);
        setPollingPriceChange24h(payload.priceChange24h);
        setPollingStatus('ready');
      } catch {
        if (!isDisposed) {
          setPollingStatus('error');
        }
      }
    };

    const intervalMs = liveInterval === '30s' ? 30_000 : 60_000;

    fetchSnapshot();

    const intervalId = window.setInterval(fetchSnapshot, intervalMs);

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
  }, [coinId, liveInterval]);

  const pollingMessage =
    pollingStatus === 'error'
      ? 'Polling is temporarily unavailable. Showing the latest cached market snapshot.'
      : `REST polling is active every ${liveInterval}. Refresh pauses in background tabs to stay within CoinGecko demo limits.`;

  return (
    <section
      id="live-data-wrapper"
      className="page-enter min-w-0 space-y-8 lg:space-y-12 flex-1 flex flex-col"
    >
      <CoinHeader
        coinId={coinId}
        name={coin.name}
        image={coin.image.large}
        livePrice={deferredPrice}
        livePriceChangePercentage24h={pollingPriceChangePercentage24h}
        priceChangePercentage30d={pollingPriceChangePercentage30d}
        priceChange24h={pollingPriceChange24h}
      />

      <div className="flex-1 flex flex-col">
        <div className="price-analysis-card glass-card rounded-3xl p-6 lg:p-8 neon-glow-purple overflow-hidden min-w-0 flex-1">
          <CandlestickChart
            coinId={coinId}
            data={coinOHLCData}
            liveOhlcv={null}
            mode="live"
            initialPeriod="daily"
            liveInterval={liveInterval}
            setLiveInterval={setLiveInterval}
            liveFeedEnabled
            liveFeedMessage={pollingMessage}
          >
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-brand-purple/90">
                <span className="h-2 w-2 rounded-full bg-brand-purple shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
                Live Market Trend
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-bold tracking-tight sm:text-3xl">Price Analysis</h4>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-[15px]">
                  Monitor intraday structure, compare broader timeframes, and switch refresh cadence
                  without leaving the chart.
                </p>
              </div>
            </div>
          </CandlestickChart>
        </div>
      </div>
    </section>
  );
};

export default LiveDataWrapper;

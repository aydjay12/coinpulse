'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  getCandlestickConfig,
  getChartConfig,
  LIVE_INTERVAL_BUTTONS,
  PERIOD_BUTTONS,
} from '@/constants';
import { CandlestickSeries, createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { cn, convertOHLCData } from '@/lib/utils';
import { Activity, AlertCircle, CalendarRange, RefreshCcw } from 'lucide-react';

const CandlestickChart = ({
  children,
  data,
  coinId,
  height = 360,
  initialPeriod = 'daily',
  liveOhlcv = null,
  mode = 'historical',
  liveInterval,
  setLiveInterval,
  liveFeedEnabled = true,
}: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const prevOhlcDataLength = useRef<number>(data?.length || 0);

  const [period, setPeriod] = useState(initialPeriod);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>(data ?? []);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isFetchingPeriod, setIsFetchingPeriod] = useState(false);
  const [isPending, startTransition] = useTransition();

  const applyChartWidth = useCallback(() => {
    const container = chartContainerRef.current;
    const chart = chartRef.current;
    if (!container || !chart) return;

    // offsetWidth is constrained by overflow:hidden ancestors; getBoundingClientRect can
    // report the canvas' inflated size when ancestor overflow is unconstrained.
    const width = Math.max(Math.min(container.offsetWidth, window.innerWidth), 1);
    chart.applyOptions({ width });
  }, []);

  const fetchOHLCData = useCallback(
    async (selectedPeriod: Period) => {
      try {
        setIsFetchingPeriod(true);
        setChartError(null);

        const response = await fetch(`/api/coins/${coinId}/ohlc?period=${selectedPeriod}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load chart data');
        }

        const payload = (await response.json()) as { data?: OHLCData[] };
        const newData = payload.data ?? [];

        startTransition(() => {
          setOhlcData(newData ?? []);
        });
      } catch (e) {
        console.error('Failed to fetch OHLCData', e);
        setChartError(e instanceof Error ? e.message : 'Failed to load chart data');
      } finally {
        setIsFetchingPeriod(false);
      }
    },
    [coinId],
  );

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;

    setPeriod(newPeriod);
    fetchOHLCData(newPeriod);
  };

  useEffect(() => {
    setOhlcData(data ?? []);
  }, [data]);

  useEffect(() => {
    if (!liveFeedEnabled) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    const intervalMs = liveInterval === '30s' ? 30_000 : 60_000;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchOHLCData(period);
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOHLCData(period);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coinId, fetchOHLCData, liveFeedEnabled, liveInterval, period]);

  const segmentedButtonClassName =
    'relative rounded-xl px-3.5 py-2 text-xs font-semibold tracking-[0.02em] transition-all duration-200 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      ...getChartConfig(height, ['daily', 'weekly', 'monthly'].includes(initialPeriod)),
      width: Math.max(
        Math.floor(container.getBoundingClientRect().width),
        container.clientWidth,
        1,
      ),
    });
    const series = chart.addSeries(CandlestickSeries, getCandlestickConfig());

    chartRef.current = chart;
    candleSeriesRef.current = series;

    const syncChartSize = () => {
      requestAnimationFrame(() => {
        applyChartWidth();
        chart.timeScale().fitContent();
      });
    };

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      // Use offsetWidth, not contentRect.width, to get the layout-clipped size
      const width = Math.max(Math.min(container.offsetWidth, window.innerWidth), 1);
      requestAnimationFrame(() => {
        chart.applyOptions({ width });
        chart.timeScale().fitContent();
      });
    });
    observer.observe(container);
    syncChartSize();

    const handleViewportResize = () => syncChartSize();
    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('orientationchange', handleViewportResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('orientationchange', handleViewportResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [applyChartWidth, height, initialPeriod]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const showTime = ['daily', 'weekly', 'monthly'].includes(period);
    chart.applyOptions({
      ...getChartConfig(height, showTime),
    });

    requestAnimationFrame(() => {
      applyChartWidth();
      chart.timeScale().fitContent();
    });
  }, [applyChartWidth, height, period]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const convertedToSeconds = ohlcData.map(
      (item) => [Math.floor(item[0] / 1000), item[1], item[2], item[3], item[4]] as OHLCData,
    );

    let merged: OHLCData[];

    if (liveOhlcv) {
      const liveTimestamp = liveOhlcv[0];

      const lastHistoricalCandle = convertedToSeconds[convertedToSeconds.length - 1];

      if (lastHistoricalCandle && lastHistoricalCandle[0] === liveTimestamp) {
        merged = [...convertedToSeconds.slice(0, -1), liveOhlcv];
      } else {
        merged = [...convertedToSeconds, liveOhlcv];
      }
    } else {
      merged = convertedToSeconds;
    }

    merged.sort((a, b) => a[0] - b[0]);

    const converted = convertOHLCData(merged);
    candleSeriesRef.current.setData(converted);

    const dataChanged = prevOhlcDataLength.current !== ohlcData.length;

    if (dataChanged || mode === 'historical') {
      requestAnimationFrame(() => {
        applyChartWidth();
        chartRef.current?.timeScale().fitContent();
      });
      prevOhlcDataLength.current = ohlcData.length;
    }
  }, [applyChartWidth, ohlcData, period, liveOhlcv, mode]);

  return (
    <div id="candlestick-chart" className="flex h-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">{children}</div>

        <div className="min-w-0 flex flex-col gap-3 xl:min-w-[25rem] xl:items-end">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.22)] backdrop-blur-xl">
            <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <CalendarRange size={14} className="text-brand-blue" />
              Period
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIOD_BUTTONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={cn(
                    segmentedButtonClassName,
                    period === value
                      ? 'brand-gradient-bg text-white shadow-[0_10px_30px_rgba(59,130,246,0.25)]'
                      : 'border border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
                  )}
                  onClick={() => handlePeriodChange(value)}
                  disabled={isPending || isFetchingPeriod}
                  aria-pressed={period === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {liveInterval && (
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.22)] backdrop-blur-xl">
              <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Activity size={14} className="text-brand-purple" />
                Update Frequency
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LIVE_INTERVAL_BUTTONS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={cn(
                      segmentedButtonClassName,
                      'min-w-[5rem]',
                      liveInterval === value
                        ? 'bg-brand-purple text-white shadow-[0_10px_30px_rgba(139,92,246,0.32)] ring-1 ring-brand-purple/40'
                        : 'border border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
                      !liveFeedEnabled &&
                        'cursor-not-allowed opacity-45 hover:text-muted-foreground',
                    )}
                    onClick={() => liveFeedEnabled && setLiveInterval && setLiveInterval(value)}
                    disabled={isPending || isFetchingPeriod || !liveFeedEnabled}
                    aria-pressed={liveInterval === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {chartError ? (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span>{chartError}</span>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:bg-red-500/20"
              onClick={() => fetchOHLCData(period)}
              disabled={isFetchingPeriod}
            >
              <RefreshCcw size={14} />
              Try Again
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={chartContainerRef}
        className="chart w-full min-w-0 flex-1 overflow-hidden"
        style={{ minHeight: height }}
      />
    </div>
  );
};

export default CandlestickChart;

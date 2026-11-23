'use client';

import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';
import WatchlistStar from '@/components/WatchlistStar';
import './CoinHeader.css';

const CoinHeader = ({
  coinId,
  livePriceChangePercentage24h,
  priceChangePercentage30d,
  name,
  image,
  livePrice,
  priceChange24h,
}: LiveCoinHeaderProps) => {
  const isTrendingUp = livePriceChangePercentage24h > 0;
  const isThirtyDayUp = priceChangePercentage30d > 0;
  const isPriceChangeUp = priceChange24h > 0;

  const stats = [
    {
      label: 'Today',
      value: livePriceChangePercentage24h,
      isUp: isTrendingUp,
      formatter: formatPercentage,
      showIcon: true,
    },
    {
      label: '30 Days',
      value: priceChangePercentage30d,
      isUp: isThirtyDayUp,
      formatter: formatPercentage,
      showIcon: true,
    },
    {
      label: 'Price Change (24h)',
      value: priceChange24h,
      isUp: isPriceChangeUp,
      formatter: formatCurrency,
      showIcon: false,
    },
  ];

  return (
    <div
      id="coin-header"
      className="glass-card rounded-3xl p-8 neon-glow-blue space-y-8 overflow-hidden relative"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6">
          <div className="p-4 glass-card rounded-2xl shadow-2xl bg-white/5">
            <Image src={image} alt={name} width={64} height={64} className="rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{name}</h1>
              <div className="flex items-center justify-center p-1">
                <WatchlistStar coinId={coinId} size={28} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold brand-gradient-text">
                {formatCurrency(livePrice)}
              </span>
              <Badge
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold border',
                  isTrendingUp
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20',
                )}
              >
                {isTrendingUp ? '+' : ''}
                {formatPercentage(livePriceChangePercentage24h)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-4 border-white/5 bg-white/[0.02]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {stat.label}
            </p>
            <div
              className={cn(
                'flex items-center gap-2 text-lg font-bold',
                stat.isUp ? 'text-green-500' : 'text-red-500',
              )}
            >
              {stat.value > 0 && stat.showIcon ? '+' : ''}
              {stat.formatter(stat.value)}
              {stat.showIcon && (stat.isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CoinHeader;

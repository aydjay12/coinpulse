import { fetcher } from '@/lib/coingecko.actions';
import Image from 'next/image';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import WatchlistStar from '@/components/WatchlistStar';
import DataTable from '@/components/DataTable';
import { TrendingCoinsFallback } from './fallback';
import './TrendingCoins.css';

const TrendingCoins = async () => {
  let trendingCoins;

  try {
    trendingCoins = await fetcher<{ coins: TrendingCoin[] }>('/search/trending', undefined, 300);
  } catch {
    return <TrendingCoinsFallback />;
  }

  const columns: DataTableColumn<TrendingCoin>[] = [
    {
      header: '',
      cellClassName: 'star-cell w-[50px]',
      cell: (coin) => <WatchlistStar coinId={coin.item.id} />,
    },
    {
      header: 'Name',
      cellClassName: 'name-cell',
      cell: (coin) => {
        const item = coin.item;

        return (
          <div>
            <Image src={item.large} alt={item.name} width={36} height={36} />
            <p>{item.name}</p>
          </div>
        );
      },
    },
    {
      header: '24h Change',
      cellClassName: 'change-cell',
      cell: (coin) => {
        const item = coin.item;
        const isTrendingUp = item.data.price_change_percentage_24h.usd > 0;

        return (
          <div className={`price-change ${isTrendingUp ? 'trend-up' : 'trend-down'}`}>
            <p>
              {formatPercentage(item.data.price_change_percentage_24h.usd)}
              {isTrendingUp ? (
                <TrendingUp width={16} height={16} />
              ) : (
                <TrendingDown width={16} height={16} />
              )}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Price',
      cellClassName: 'price-cell',
      cell: (coin) => formatCurrency(coin.item.data.price),
    },
  ];

  return (
    <div id="trending-coins" className="trending-coins">
      <div className="trending-header">
        <h4 className="trending-title">
          <TrendingUp className="trending-icon" size={24} />
          Market Trending
        </h4>
      </div>

      <DataTable
        data={trendingCoins.coins.slice(0, 6) || []}
        columns={columns}
        rowKey={(coin) => coin.item.id}
        rowHref={(coin) => `/coins/${coin.item.id}`}
        rowAriaLabel={(coin) => `Open ${coin.item.name}`}
        tableClassName="trending-table"
        headerCellClassName="trending-table th"
        bodyCellClassName="trending-table td"
      />
    </div>
  );
};

export default TrendingCoins;

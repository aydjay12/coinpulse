import { fetcher } from '@/lib/coingecko.actions';
import Image from 'next/image';
import { cn, formatPercentage, formatCurrency } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import AppPagination from '@/components/AppPagination';
import { Coins } from 'lucide-react';
import WatchlistStar from '@/components/WatchlistStar';
import ErrorState from '@/components/ErrorState';
import './coins.css';

const CoinsPage = async ({ searchParams }: NextPageProps) => {
  const { page } = await searchParams;

  const currentPage = Number(page) || 1;
  const perPage = 10;
  let coinsData: CoinMarketData[];

  try {
    coinsData = await fetcher<CoinMarketData[]>('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: perPage,
      page: currentPage,
      sparkline: 'false',
      price_change_percentage: '24h',
    });
  } catch (error) {
    return (
      <main
        id="coins-page-error"
        className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center"
      >
        <ErrorState
          title="Explorer Unavailable"
          message={
            error instanceof Error
              ? error.message
              : "We couldn't reach the market intelligence data. Please verify your connection."
          }
          retryHref={`/coins?page=${currentPage}`}
          className="w-full"
        />
      </main>
    );
  }

  const columns: DataTableColumn<CoinMarketData>[] = [
    {
      header: '',
      cellClassName: 'star-cell w-[50px]',
      cell: (coin) => <WatchlistStar coinId={coin.id} />,
    },
    {
      header: 'Rank',
      cellClassName: 'rank-cell',
      cell: (coin) => <>#{coin.market_cap_rank}</>,
    },
    {
      header: 'Token',
      cellClassName: 'token-cell',
      cell: (coin) => (
        <div className="token-info">
          <Image src={coin.image} alt={coin.name} width={36} height={36} />
          <p>
            {coin.name} ({coin.symbol.toUpperCase()})
          </p>
        </div>
      ),
    },
    {
      header: 'Price',
      cellClassName: 'price-cell',
      cell: (coin) => formatCurrency(coin.current_price),
    },
    {
      header: '24h Change',
      cellClassName: 'change-cell',
      cell: (coin) => {
        const isTrendingUp = coin.price_change_percentage_24h > 0;

        return (
          <span
            className={cn('change-value', {
              'text-green-600': isTrendingUp,
              'text-red-500': !isTrendingUp,
            })}
          >
            {isTrendingUp && '+'}
            {formatPercentage(coin.price_change_percentage_24h)}
          </span>
        );
      },
    },
    {
      header: 'Market Cap',
      cellClassName: 'market-cap-cell',
      cell: (coin) => formatCurrency(coin.market_cap),
    },
  ];

  const hasMorePages = coinsData.length === perPage;
  const estimatedTotalPages = currentPage >= 100 ? Math.ceil(currentPage / 100) * 100 + 100 : 100;

  return (
    <main id="coins-page" className="main-container py-8 lg:py-12">
      <div className="flex flex-col gap-2 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          Global <span className="brand-gradient-text">Asset Explorer</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl font-medium">
          Analyze and track the performance of every digital asset in the Coinnex ecosystem.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-0 overflow-hidden neon-glow-blue animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 glass-card rounded-lg bg-brand-blue/10 text-brand-blue">
              <Coins size={20} />
            </span>
            All Assets
          </h4>
        </div>

        <DataTable
          tableClassName="coins-table border-0"
          columns={columns}
          data={coinsData}
          rowKey={(coin) => coin.id}
          rowHref={(coin) => `/coins/${coin.id}`}
          rowAriaLabel={(coin) => `Open ${coin.name}`}
          headerCellClassName="bg-transparent!"
          bodyCellClassName="border-white/5"
        />

        <div className="p-6 border-t border-white/10 bg-white/5">
          <AppPagination
            currentPage={currentPage}
            totalPages={estimatedTotalPages}
            hasMorePages={hasMorePages}
          />
        </div>
      </div>
    </main>
  );
};

export default CoinsPage;

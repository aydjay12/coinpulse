import React from 'react';
import { fetcher } from '@/lib/coingecko.actions';
import { formatCurrency } from '@/lib/utils';
import LiveDataWrapper from '@/components/LiveDataWrapper';
import CoinMarketSections from '@/components/CoinMarketSections';
import CoinDetailsSidebar from '@/components/CoinDetailsSidebar';
import ErrorState from '@/components/ErrorState';
import './coins-details.css';

const Page = async ({ params }: NextPageProps) => {
  const { id } = await params;
  let coinData: CoinDetailsData;
  let coinOHLCData: OHLCData[];
  let marketSnapshot: CoinMarketData[];

  try {
    [coinData, coinOHLCData, marketSnapshot] = await Promise.all([
      fetcher<CoinDetailsData>(`/coins/${id}`),
      fetcher<OHLCData[]>(`/coins/${id}/ohlc`, {
        vs_currency: 'usd',
        days: 1,
        precision: 'full',
      }),
      fetcher<CoinMarketData[]>('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: 'false',
        price_change_percentage: '24h',
      }).catch(() => []),
    ]);
  } catch (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center">
        <ErrorState
          title="Asset Details Unavailable"
          message={
            error instanceof Error
              ? error.message
              : "We couldn't retrieve the detailed intelligence for this digital asset. Check the symbol and try again."
          }
          retryHref={`/coins/${id}`}
          className="w-full"
        />
      </main>
    );
  }

  const normalizeMovers = (items?: CoinMarketData[]) =>
    (items ?? [])
      .filter((item) => item?.id)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        image: item.image,
        price: item.current_price,
        priceChangePercentage24h: item.price_change_percentage_24h,
      }));

  const rankedMovers = marketSnapshot
    .filter((coin) => coin.id !== id && Number.isFinite(coin.price_change_percentage_24h))
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);

  const topGainers = normalizeMovers(
    rankedMovers.filter((coin) => coin.price_change_percentage_24h > 0),
  );
  const topLosers = normalizeMovers(
    [...rankedMovers].reverse().filter((coin) => coin.price_change_percentage_24h < 0),
  );

  const coinDetails = [
    {
      label: 'Market Cap',
      value: formatCurrency(coinData.market_data.market_cap.usd),
    },
    {
      label: 'Market Cap Rank',
      value: `# ${coinData.market_cap_rank}`,
    },
    {
      label: 'Total Volume',
      value: formatCurrency(coinData.market_data.total_volume.usd),
    },
    {
      label: 'Website',
      value: '-',
      link: coinData.links.homepage[0],
      linkText: 'Homepage',
    },
    {
      label: 'Explorer',
      value: '-',
      link: coinData.links.blockchain_site[0],
      linkText: 'Explorer',
    },
    {
      label: 'Community',
      value: '-',
      link: coinData.links.subreddit_url,
      linkText: 'Community',
    },
  ];

  return (
    <main id="coin-details-page" className="main-container py-8 lg:py-12 page-enter">
      <div className="coins-details-top-row flex flex-col lg:flex-row gap-8 xl:gap-12">
        <section className="lg:w-2/3 min-w-0 flex flex-col">
          <LiveDataWrapper coinId={id} coin={coinData} coinOHLCData={coinOHLCData} />
        </section>

        <CoinDetailsSidebar
          symbol={coinData.symbol}
          icon={coinData.image.small}
          priceList={coinData.market_data.current_price}
          coinDetails={coinDetails}
        />
      </div>

      <CoinMarketSections
        coinId={id}
        topGainers={topGainers}
        topLosers={topLosers}
        fallbackTickers={coinData.tickers.slice(0, 7)}
      />
    </main>
  );
};
export default Page;

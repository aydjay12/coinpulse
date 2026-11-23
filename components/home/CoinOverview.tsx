import React from 'react';
import { fetcher } from '@/lib/coingecko.actions';
import { CoinOverviewFallback } from './fallback';
import CoinOverviewClient from './CoinOverviewClient';

const CoinOverview = async () => {
  let coin: CoinDetailsData;
  let coinOHLCData: OHLCData[];

  try {
    [coin, coinOHLCData] = await Promise.all([
      fetcher<CoinDetailsData>('/coins/bitcoin'),
      fetcher<OHLCData[]>('/coins/bitcoin/ohlc', {
        vs_currency: 'usd',
        days: 1,
        precision: 'full',
      }),
    ]);
  } catch {
    return <CoinOverviewFallback />;
  }

  return <CoinOverviewClient coin={coin} coinOHLCData={coinOHLCData} />;
};

export default CoinOverview;

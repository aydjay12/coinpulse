'use client';

import React from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import CandlestickChart from '@/components/CandlestickChart';
import './CoinOverview.css';

interface CoinOverviewClientProps {
  coin: CoinDetailsData;
  coinOHLCData: OHLCData[];
}

const CoinOverviewClient: React.FC<CoinOverviewClientProps> = ({ coin, coinOHLCData }) => {
  const [liveInterval, setLiveInterval] = React.useState<'30s' | '60s'>('30s');

  return (
    <div id="coin-overview" className="coin-overview">
      <CandlestickChart
        data={coinOHLCData}
        coinId="bitcoin"
        liveInterval={liveInterval}
        setLiveInterval={setLiveInterval}
      >
        <div className="coin-header">
          <div className="coin-logo-container">
            <Image
              src={coin.image.large}
              alt={coin.name}
              width={48}
              height={48}
              className="coin-logo"
            />
          </div>
          <div className="coin-info">
            <span className="coin-benchmark">Market Benchmark</span>
            <div className="coin-name-group">
              <h1 className="coin-name">{coin.name}</h1>
              <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
            </div>
            <h2 className="coin-price">{formatCurrency(coin.market_data.current_price.usd)}</h2>
          </div>
        </div>
      </CandlestickChart>
    </div>
  );
};

export default CoinOverviewClient;

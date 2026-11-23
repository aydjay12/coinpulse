import { NextRequest, NextResponse } from 'next/server';
import qs from 'query-string';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'CoinGecko credentials are missing.' }, { status: 500 });
  }

  const { id } = await context.params;
  const isDemo = API_KEY.startsWith('CG-');
  const headerName = isDemo ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key';

  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL.replace(/\/$/, '')}/coins/${id}`,
      query: {
        localization: 'false',
        community_data: 'false',
        developer_data: 'false',
        sparkline: 'false',
      },
    },
    { skipEmptyString: true, skipNull: true },
  );

  try {
    const response = await fetch(url, {
      headers: {
        [headerName]: API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Unable to load coin snapshot.' },
        { status: response.status },
      );
    }

    const coin = (await response.json()) as CoinDetailsData;

    return NextResponse.json(
      {
        price: coin.market_data.current_price.usd,
        priceChangePercentage24h: coin.market_data.price_change_percentage_24h_in_currency.usd,
        priceChangePercentage30d: coin.market_data.price_change_percentage_30d_in_currency.usd,
        priceChange24h: coin.market_data.price_change_24h_in_currency.usd,
        tickers: coin.tickers.slice(0, 7),
        fetchedAt: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Unable to load coin snapshot.' }, { status: 500 });
  }
}

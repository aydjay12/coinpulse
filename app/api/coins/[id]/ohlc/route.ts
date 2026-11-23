import { NextRequest, NextResponse } from 'next/server';
import qs from 'query-string';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

const PERIOD_TO_DAYS: Record<Period, number | string> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  '3months': 90,
  '6months': 180,
  yearly: 365,
  max: 365,
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'CoinGecko credentials are missing.' }, { status: 500 });
  }

  const { id } = await context.params;
  const periodParam = request.nextUrl.searchParams.get('period') as Period | null;
  const period = periodParam && PERIOD_TO_DAYS[periodParam] ? periodParam : 'daily';
  const isDemo = API_KEY.startsWith('CG-');
  const headerName = isDemo ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key';

  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL.replace(/\/$/, '')}/coins/${id}/ohlc`,
      query: {
        vs_currency: 'usd',
        days: PERIOD_TO_DAYS[period],
        precision: 'full',
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
        { error: 'Unable to load chart data.' },
        { status: response.status },
      );
    }

    const data = (await response.json()) as OHLCData[];

    return NextResponse.json(
      { data, fetchedAt: Date.now() },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Unable to load chart data.' }, { status: 500 });
  }
}

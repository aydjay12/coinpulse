import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';

type ToggleWatchlistBody = {
  coinId?: string;
  shouldWatch?: boolean;
};

const COIN_ID_PATTERN = /^[a-z0-9._-]+$/i;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

async function readBody<T>(request: NextRequest) {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {} as Partial<T>;
  }
}

function normalizeCoinId(coinId?: string) {
  return coinId?.trim().toLowerCase() ?? '';
}

function getCoinGeckoConfig() {
  const baseUrl = process.env.COINGECKO_BASE_URL;
  const apiKey = process.env.COINGECKO_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('CoinGecko API is not configured');
  }

  const isDemo = apiKey.startsWith('CG-');
  const headerName = isDemo ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key';

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, headerName };
}

export async function fetchWatchlistMarkets(ids: string[]) {
  if (!ids.length) return [];

  const { baseUrl, apiKey, headerName } = getCoinGeckoConfig();
  const url = new URL(`${baseUrl}/coins/markets`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('order', 'market_cap_desc');
  url.searchParams.set('per_page', String(Math.min(ids.length, 250)));
  url.searchParams.set('page', '1');
  url.searchParams.set('sparkline', 'false');
  url.searchParams.set('price_change_percentage', '24h');

  const response = await fetch(url.toString(), {
    headers: {
      [headerName]: apiKey,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko request failed with ${response.status}`);
  }

  return response.json();
}

export async function getWatchlistIds(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    return NextResponse.json({
      success: true,
      ids: user.watchlist ?? [],
    });
  } catch (error) {
    console.error('Error loading watchlist IDs:', error);
    return jsonError('Failed to load watchlist', 500);
  }
}

export async function getWatchlist(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const ids = user.watchlist ?? [];
    const coins = await fetchWatchlistMarkets(ids);

    return NextResponse.json({
      success: true,
      ids,
      coins,
    });
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return jsonError('Failed to load watchlist', 500);
  }
}

export async function toggleWatchlist(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const body = await readBody<ToggleWatchlistBody>(request);
    const coinId = normalizeCoinId(body.coinId);

    if (!coinId || !COIN_ID_PATTERN.test(coinId)) {
      return jsonError('Invalid coin ID');
    }

    const currentIds = new Set(user.watchlist ?? []);
    const nextIsWatched =
      typeof body.shouldWatch === 'boolean' ? body.shouldWatch : !currentIds.has(coinId);

    if (nextIsWatched) {
      currentIds.add(coinId);
    } else {
      currentIds.delete(coinId);
    }

    user.watchlist = Array.from(currentIds);
    await user.save({ validateBeforeSave: false });

    return NextResponse.json({
      success: true,
      coinId,
      isWatched: nextIsWatched,
      ids: user.watchlist,
    });
  } catch (error) {
    console.error('Error toggling watchlist:', error);
    return jsonError('Failed to update watchlist', 500);
  }
}

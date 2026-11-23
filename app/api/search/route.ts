import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ coins: [] });
  }

  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ coins: [] }, { status: 500 });
  }

  const isDemo = API_KEY.startsWith('CG-');
  const headerName = isDemo ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key';

  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/search`);
  url.searchParams.set('query', query);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        [headerName]: API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json({ coins: [] }, { status: response.status });
    }

    const data = (await response.json()) as { coins?: SearchCoin[] };

    return NextResponse.json({
      coins: (data.coins ?? []).slice(0, 8),
    });
  } catch {
    return NextResponse.json({ coins: [] }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { getWalletPortfolio } from '@/lib/wallets/handlers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> },
) {
  const { walletAddress } = await params;
  return getWalletPortfolio(request, walletAddress);
}

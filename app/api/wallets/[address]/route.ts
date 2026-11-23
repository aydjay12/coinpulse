import { NextRequest } from 'next/server';
import { disconnectWallet } from '@/lib/wallets/handlers';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  return disconnectWallet(request, address);
}

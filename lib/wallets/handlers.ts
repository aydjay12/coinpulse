import { NextRequest, NextResponse } from 'next/server';
import type { Types } from 'mongoose';
import { getAuthUser, toPublicUser } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import PortfolioSnapshot from '@/lib/models/PortfolioSnapshot';
import WalletModel, { type WalletDocument } from '@/lib/models/Wallet';
import { fetchWatchlistMarkets } from '@/lib/watchlist/handlers';
import {
  getExplorerAddressUrl,
  SUPPORTED_CHAIN_IDS,
  type SupportedChainId,
} from '@/lib/wallets/chains';
import {
  getPortfolioForWallets,
  getTransactionsForWallets,
  supportedChainsForApi,
} from '@/lib/wallets/moralis';
import type { LinkedWallet } from '@/lib/wallets/types';

type WalletBody = {
  address?: string;
  label?: string;
  chains?: string[];
};

type UserId = string | Types.ObjectId;

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000;
const SNAPSHOT_LIMIT = 30;

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

function normalizeWalletAddress(address?: string) {
  return address?.trim().toLowerCase() ?? '';
}

function isSupportedChainId(chainId: string): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}

function normalizeChains(chains?: string[]) {
  if (!Array.isArray(chains) || chains.length === 0) return [...SUPPORTED_CHAIN_IDS];

  const nextChains = chains.map((chain) => chain.trim().toLowerCase()).filter(isSupportedChainId);

  return nextChains.length ? Array.from(new Set(nextChains)) : [...SUPPORTED_CHAIN_IDS];
}

function toLinkedWallet(wallet: WalletDocument): LinkedWallet {
  const address = wallet.address.toLowerCase();
  const chains = normalizeChains(wallet.chains);

  return {
    id: wallet._id.toString(),
    address,
    label: wallet.label || 'Wallet',
    chains,
    createdAt: wallet.createdAt.toISOString(),
    explorerUrl: getExplorerAddressUrl(chains[0] ?? 'ethereum', address),
  };
}

export async function getLinkedWalletsForUser(userId: UserId) {
  await connectDB();
  const wallets = await WalletModel.find({ userId }).sort({ createdAt: -1 });
  return wallets.map(toLinkedWallet);
}

function providerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('MORALIS_API_KEY')) {
    return message;
  }

  return message || 'Unable to sync wallet data from Moralis right now. Please try again.';
}

async function recordPortfolioSnapshot(userId: UserId, totalBalanceUsd: number) {
  if (!Number.isFinite(totalBalanceUsd)) return;

  const latest = await PortfolioSnapshot.findOne({ userId }).sort({ createdAt: -1 });
  const shouldCreate =
    !latest ||
    Date.now() - latest.createdAt.getTime() >= SNAPSHOT_INTERVAL_MS ||
    Math.abs(latest.totalBalanceUsd - totalBalanceUsd) >= 0.01;

  if (shouldCreate) {
    await PortfolioSnapshot.create({ userId, totalBalanceUsd });
  }
}

async function getPortfolioSeries(userId: UserId) {
  const snapshots = await PortfolioSnapshot.find({ userId })
    .sort({ createdAt: -1 })
    .limit(SNAPSHOT_LIMIT)
    .lean();

  return snapshots.reverse().map((snapshot) => ({
    timestamp: snapshot.createdAt.toISOString(),
    totalBalanceUsd: snapshot.totalBalanceUsd,
  }));
}

export async function listWallets(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const wallets = await getLinkedWalletsForUser(user._id);

    return NextResponse.json({
      success: true,
      wallets,
      supportedChains: supportedChainsForApi(),
    });
  } catch (error) {
    console.error('Error listing wallets:', error);
    return jsonError('Failed to load wallets', 500);
  }
}

export async function connectWallet(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const body = await readBody<WalletBody>(request);
    const address = normalizeWalletAddress(body.address);

    if (!WALLET_ADDRESS_PATTERN.test(address)) {
      return jsonError('Enter a valid EVM wallet address.');
    }

    const walletCount = await WalletModel.countDocuments({ userId: user._id });
    const label = body.label?.trim() || `Wallet ${walletCount + 1}`;

    const wallet = await WalletModel.create({
      userId: user._id,
      address,
      label,
      chains: normalizeChains(body.chains),
    });

    return NextResponse.json(
      {
        success: true,
        wallet: toLinkedWallet(wallet),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error connecting wallet:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      return jsonError('That wallet is already linked to your account.', 409);
    }

    return jsonError('Failed to connect wallet', 500);
  }
}

export async function disconnectWallet(request: NextRequest, addressParam: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const address = normalizeWalletAddress(addressParam);
    if (!WALLET_ADDRESS_PATTERN.test(address)) {
      return jsonError('Invalid wallet address.');
    }

    const wallet = await WalletModel.findOneAndDelete({ userId: user._id, address });
    if (!wallet) return jsonError('Wallet not found', 404);

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return jsonError('Failed to disconnect wallet', 500);
  }
}

export async function getPortfolio(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const wallets = await getLinkedWalletsForUser(user._id);

    if (wallets.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          totalBalanceUsd: 0,
          change24hUsd: 0,
          changePercentage24h: 0,
          walletCount: 0,
          assetCount: 0,
          bestPerformer: null,
        },
        wallets: [],
        topAssets: [],
        syncWarnings: [],
        supportedChains: supportedChainsForApi(),
      });
    }

    const portfolio = await getPortfolioForWallets(wallets);

    return NextResponse.json({
      success: true,
      ...portfolio,
      supportedChains: supportedChainsForApi(),
    });
  } catch (error) {
    console.error('Error loading portfolio:', error);
    return jsonError(providerErrorMessage(error), 500);
  }
}

export async function getWalletPortfolio(request: NextRequest, addressParam: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const address = normalizeWalletAddress(addressParam);
    const wallets = await getLinkedWalletsForUser(user._id);
    const wallet = wallets.find((item) => item.address === address);

    if (!wallet) return jsonError('Wallet not found', 404);

    const portfolio = await getPortfolioForWallets([wallet]);

    return NextResponse.json({
      success: true,
      wallet: portfolio.wallets[0],
      supportedChains: supportedChainsForApi(),
    });
  } catch (error) {
    console.error('Error loading wallet portfolio:', error);
    return jsonError(providerErrorMessage(error), 500);
  }
}

export async function getTransactions(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const wallets = await getLinkedWalletsForUser(user._id);

    if (wallets.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        wallets: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const response = await getTransactionsForWallets(wallets, {
      page: Number(searchParams.get('page') || 1),
      limit: Number(searchParams.get('limit') || 10),
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      wallet: searchParams.get('wallet') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });

    return NextResponse.json({
      success: true,
      wallets,
      ...response,
    });
  } catch (error) {
    console.error('Error loading transactions:', error);
    return jsonError(providerErrorMessage(error), 500);
  }
}

export async function getDashboard(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    const wallets = await getLinkedWalletsForUser(user._id);
    const portfolio =
      wallets.length > 0
        ? await getPortfolioForWallets(wallets)
        : {
            summary: {
              totalBalanceUsd: 0,
              change24hUsd: 0,
              changePercentage24h: 0,
              walletCount: 0,
              assetCount: 0,
              bestPerformer: null,
            },
            wallets: [],
            topAssets: [],
            syncWarnings: [],
          };

    let portfolioSeries: Awaited<ReturnType<typeof getPortfolioSeries>> = [];
    if (wallets.length > 0) {
      try {
        await recordPortfolioSnapshot(user._id, portfolio.summary.totalBalanceUsd);
        portfolioSeries = await getPortfolioSeries(user._id);
      } catch (snapshotError) {
        console.error('Error recording portfolio snapshot:', snapshotError);
      }
    }

    const transactions =
      wallets.length > 0
        ? await getTransactionsForWallets(wallets, { page: 1, limit: 5 })
        : { transactions: [], pagination: null };
    const watchlistMarkets = await fetchWatchlistMarkets((user.watchlist ?? []).slice(0, 4));

    return NextResponse.json({
      success: true,
      user: {
        username: toPublicUser(user).username,
      },
      portfolio: portfolio.summary,
      portfolioSeries,
      wallets,
      walletStats: {
        connectedWallets: wallets.length,
        trackedAssets: portfolio.summary.assetCount,
        supportedChains: supportedChainsForApi().length,
      },
      watchlist: watchlistMarkets.map((coin: CoinMarketData) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
      })),
      recentTransactions: transactions.transactions,
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return jsonError(providerErrorMessage(error), 500);
  }
}

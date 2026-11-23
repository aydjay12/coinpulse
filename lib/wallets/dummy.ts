import type {
  PortfolioAsset,
  PortfolioWallet,
  PortfolioResponse,
  WalletTransaction,
  TransactionsResponse,
  LinkedWallet
} from './types';
import { SUPPORTED_CHAINS, type SupportedChainId } from './chains';

export function getMockAssets(walletAddress: string, chainId: SupportedChainId): PortfolioAsset[] {
  const assets: PortfolioAsset[] = [
    {
      id: `${chainId}:native`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: 'native',
      name: 'Ethereum',
      symbol: 'ETH',
      amount: '1.25',
      amountNumber: 1.25,
      priceUsd: 3500.25,
      valueUsd: 4375.31,
      priceChange24h: 2.5,
      valueChange24hUsd: 106.71,
      allocation: 0,
      coinId: 'ethereum',
      isNative: true
    },
    {
      id: `${chainId}:0x123...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x1234567890123456789012345678901234567890',
      name: 'USD Coin',
      symbol: 'USDC',
      amount: '1,500.00',
      amountNumber: 1500,
      priceUsd: 1,
      valueUsd: 1500,
      priceChange24h: 0.01,
      valueChange24hUsd: 0.15,
      allocation: 0,
      coinId: 'usd-coin',
      isNative: false
    },
    {
      id: `${chainId}:0x456...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x4564567890456456789045645678904564567890',
      name: 'Chainlink',
      symbol: 'LINK',
      amount: '45.8',
      amountNumber: 45.8,
      priceUsd: 18.42,
      valueUsd: 843.63,
      priceChange24h: -1.2,
      valueChange24hUsd: -10.22,
      allocation: 0,
      coinId: 'chainlink',
      isNative: false
    },
    {
      id: `${chainId}:0x789...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x7894567890789456789045645678904564567890',
      name: 'Tether',
      symbol: 'USDT',
      amount: '1,500.00',
      amountNumber: 1500,
      priceUsd: 1,
      valueUsd: 1500,
      priceChange24h: 0.01,
      valueChange24hUsd: 0.15,
      allocation: 0,
      coinId: 'tether',
      isNative: false
    },
    {
      id: `${chainId}:0x789...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x7894567890789456789045645678904564567890',
      name: 'Tether',
      symbol: 'USDT',
      amount: '1,500.00',
      amountNumber: 1500,
      priceUsd: 1,
      valueUsd: 1500,
      priceChange24h: 0.01,
      valueChange24hUsd: 0.15,
      allocation: 0,
      coinId: 'tether',
      isNative: false
    },
    {
      id: `${chainId}:0x789...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x7894567890789456789045645678904564567890',
      name: 'Tether',
      symbol: 'USDT',
      amount: '1,500.00',
      amountNumber: 1500,
      priceUsd: 1,
      valueUsd: 1500,
      priceChange24h: 0.01,
      valueChange24hUsd: 0.15,
      allocation: 0,
      coinId: 'tether',
      isNative: false
    },
    {
      id: `${chainId}:0x789...`,
      chainId,
      chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || chainId,
      tokenAddress: '0x7894567890789456789045645678904564567890',
      name: 'Tether',
      symbol: 'USDT',
      amount: '1,500.00',
      amountNumber: 1500,
      priceUsd: 1,
      valueUsd: 1500,
      priceChange24h: 0.01,
      valueChange24hUsd: 0.15,
      allocation: 0,
      coinId: 'tether',
      isNative: false
    },
  ];

  return assets;
}

export function getMockPortfolio(linkedWallets: LinkedWallet[]): Omit<PortfolioResponse, 'success' | 'supportedChains'> {
  const wallets: PortfolioWallet[] = linkedWallets.map(wallet => {
    const chains: SupportedChainId[] = ['ethereum', 'polygon', 'arbitrum'];
    const assets = chains.flatMap(c => getMockAssets(wallet.address, c));

    const balanceUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);
    const change24hUsd = assets.reduce((sum, a) => sum + a.valueChange24hUsd, 0);

    return {
      ...wallet,
      balanceUsd,
      change24hUsd,
      changePercentage24h: (change24hUsd / (balanceUsd - change24hUsd)) * 100,
      assetCount: assets.length,
      assets: assets.map(a => ({ ...a, allocation: (a.valueUsd / balanceUsd) * 100 })),
      chainBreakdown: chains.map(c => ({
        chainId: c,
        chainName: SUPPORTED_CHAINS.find(sc => sc.id === c)?.name || c,
        balanceUsd: assets.filter(a => a.chainId === c).reduce((sum, a) => sum + a.valueUsd, 0),
        assetCount: assets.filter(a => a.chainId === c).length
      })),
      explorerUrl: '#',
      syncWarnings: []
    };
  });

  const totalBalanceUsd = wallets.reduce((sum, w) => sum + w.balanceUsd, 0);
  const totalChange24hUsd = wallets.reduce((sum, w) => sum + w.change24hUsd, 0);
  const allAssets = wallets.flatMap(w => w.assets);

  return {
    summary: {
      totalBalanceUsd,
      change24hUsd: totalChange24hUsd,
      changePercentage24h: (totalChange24hUsd / (totalBalanceUsd - totalChange24hUsd)) * 100,
      walletCount: linkedWallets.length,
      assetCount: allAssets.length,
      bestPerformer: {
        name: 'Ethereum',
        symbol: 'ETH',
        priceChange24h: 2.5
      }
    },
    wallets,
    topAssets: withAllocations(allAssets, totalBalanceUsd).slice(0, 6),
    syncWarnings: []
  };
}

function withAllocations(assets: PortfolioAsset[], totalBalance: number) {
  return assets
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .map((asset) => ({
      ...asset,
      allocation: totalBalance > 0 ? (asset.valueUsd / totalBalance) * 100 : 0,
    }));
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesFilters(transaction: WalletTransaction, filters: any) {
  const type = filters.type?.trim().toLowerCase();
  if (type && type !== 'all' && transaction.status !== type) return false;

  const wallet = filters.wallet?.trim().toLowerCase();
  if (wallet && transaction.walletAddress.toLowerCase() !== wallet) return false;

  const fromDate = parseDateBoundary(filters.from);
  const toDate = parseDateBoundary(filters.to, true);
  const timestamp = transaction.timestamp ? new Date(transaction.timestamp) : null;

  if (fromDate && timestamp && timestamp < fromDate) return false;
  if (toDate && timestamp && timestamp > toDate) return false;

  const search = filters.search?.trim().toLowerCase();
  if (!search) return true;

  return [
    transaction.asset,
    transaction.symbol,
    transaction.chainName,
    transaction.walletLabel,
    transaction.walletAddress,
    transaction.summary,
  ]
    .join(' ')
    .toLowerCase()
    .includes(search);
}

export function getMockTransactions(linkedWallets: LinkedWallet[], filters: any): Omit<TransactionsResponse, 'success' | 'wallets'> {
  const transactions: WalletTransaction[] = [];

  const types: ('send' | 'receive' | 'swap' | 'nft' | 'transfer')[] = ['send', 'receive', 'swap', 'transfer', 'nft'];

  for (let i = 0; i < 50; i++) {
    const wallet = linkedWallets[i % linkedWallets.length];
    const status = types[i % types.length];
    const symbols = ['ETH', 'USDC', 'LINK', 'UNI', 'AAVE'];
    const symbol = symbols[i % symbols.length];
    const amount = (Math.random() * 100).toFixed(2);

    const typeLabelMap: Record<string, 'Send' | 'Receive' | 'Swap' | 'NFT Transfer' | 'Transfer'> = {
      send: 'Send',
      receive: 'Receive',
      swap: 'Swap',
      nft: 'NFT Transfer',
      transfer: 'Transfer'
    };

    const typeLabel = (typeLabelMap[status] || 'Transfer') as 'Send' | 'Receive' | 'Swap' | 'NFT Transfer' | 'Transfer';

    transactions.push({
      id: `mock-tx-${i}`,
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      chainId: 'ethereum',
      chainName: 'Ethereum',
      walletAddress: wallet?.address || '0xmock...',
      walletLabel: wallet?.label || 'Mock Wallet',
      type: typeLabel,
      status,
      asset: symbol === 'ETH' ? 'Ethereum' : symbol,
      symbol,
      amount,
      valueUsd: Math.random() * 500,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      explorerUrl: '#',
      summary: `${typeLabel} ${amount} ${symbol}`
    });
  }

  const filtered = transactions.filter(tx => matchesFilters(tx, filters));

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const start = (page - 1) * limit;
  const pageItems = filtered.slice(start, start + limit);

  return {
    transactions: pageItems,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.max(Math.ceil(filtered.length / limit), 1),
      hasNextPage: start + limit < filtered.length,
      hasPreviousPage: page > 1
    }
  };
}

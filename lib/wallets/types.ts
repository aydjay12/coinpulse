import type { SupportedChainId } from '@/lib/wallets/chains';

export type LinkedWallet = {
  id: string;
  address: string;
  label: string;
  chains: SupportedChainId[];
  createdAt: string;
  explorerUrl: string;
};

export type PortfolioAsset = {
  id: string;
  chainId: SupportedChainId;
  chainName: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  amount: string;
  amountNumber: number;
  priceUsd: number;
  valueUsd: number;
  priceChange24h: number | null;
  valueChange24hUsd: number;
  allocation: number;
  coinId?: string;
  isNative: boolean;
};

export type WalletSyncWarning = {
  walletAddress: string;
  chainId: SupportedChainId;
  chainName: string;
  message: string;
};

export type PortfolioWallet = LinkedWallet & {
  balanceUsd: number;
  change24hUsd: number;
  changePercentage24h: number;
  assetCount: number;
  assets: PortfolioAsset[];
  chainBreakdown: {
    chainId: SupportedChainId;
    chainName: string;
    balanceUsd: number;
    assetCount: number;
  }[];
  syncWarnings: WalletSyncWarning[];
};

export type PortfolioSummary = {
  totalBalanceUsd: number;
  change24hUsd: number;
  changePercentage24h: number;
  walletCount: number;
  assetCount: number;
  bestPerformer: {
    name: string;
    symbol: string;
    priceChange24h: number;
  } | null;
};

export type PortfolioResponse = {
  success: true;
  summary: PortfolioSummary;
  wallets: PortfolioWallet[];
  topAssets: PortfolioAsset[];
  syncWarnings: WalletSyncWarning[];
  supportedChains: {
    id: SupportedChainId;
    name: string;
    shortName: string;
  }[];
};

export type WalletDetailResponse = {
  success: true;
  wallet: PortfolioWallet;
  supportedChains: PortfolioResponse['supportedChains'];
};

export type WalletTransaction = {
  id: string;
  hash: string;
  chainId: SupportedChainId;
  chainName: string;
  walletAddress: string;
  walletLabel: string;
  type: 'Send' | 'Receive' | 'Swap' | 'NFT Transfer' | 'Transfer';
  status: 'send' | 'receive' | 'swap' | 'nft' | 'transfer';
  asset: string;
  symbol: string;
  amount: string;
  valueUsd: number | null;
  timestamp: string;
  explorerUrl: string;
  summary: string;
};

export type TransactionsResponse = {
  success: true;
  transactions: WalletTransaction[];
  wallets: LinkedWallet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type DashboardResponse = {
  success: true;
  user: {
    username: string;
  };
  portfolio: PortfolioSummary;
  portfolioSeries: {
    timestamp: string;
    totalBalanceUsd: number;
  }[];
  wallets: LinkedWallet[];
  walletStats: {
    connectedWallets: number;
    trackedAssets: number;
    supportedChains: number;
  };
  watchlist: {
    id: string;
    name: string;
    symbol: string;
    image: string;
    price: number;
    change24h: number;
  }[];
  recentTransactions: WalletTransaction[];
};

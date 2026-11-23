import {
  SUPPORTED_CHAINS,
  getExplorerTxUrl,
  type SupportedChainConfig,
} from '@/lib/wallets/chains';
import type {
  LinkedWallet,
  PortfolioAsset,
  PortfolioResponse,
  PortfolioWallet,
  TransactionsResponse,
  WalletTransaction,
  WalletSyncWarning,
} from '@/lib/wallets/types';
import { getMockPortfolio, getMockTransactions } from './dummy';

const USE_DUMMY_DATA = false;

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';
const MORALIS_HISTORY_PAGE_LIMIT = 100;
const MAX_HISTORY_PAGES_PER_CHAIN = 3;
const MAX_HISTORY_ITEMS_PER_CHAIN = MORALIS_HISTORY_PAGE_LIMIT * MAX_HISTORY_PAGES_PER_CHAIN;

type JsonRecord = Record<string, unknown>;

type TransactionFilters = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  wallet?: string;
  from?: string;
  to?: string;
};

type ChainHistoryPage = {
  transactions: WalletTransaction[];
  hasMore: boolean;
};

type ChainAssetResult = {
  chain: SupportedChainConfig;
  assets: PortfolioAsset[];
  warnings: WalletSyncWarning[];
};

function getApiKey() {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    throw new Error('MORALIS_API_KEY is not configured. Add it to .env to sync wallet data.');
  }

  return apiKey;
}

async function moralisGet<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const url = new URL(`${MORALIS_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'X-API-Key': getApiKey(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = '';
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message || body.error || '';
    } catch {
      message = await response.text().catch(() => '');
    }

    throw new Error(
      `Moralis request failed with ${response.status}${message ? `: ${message}` : ''}`,
    );
  }

  return (await response.json()) as T;
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function readString(record: JsonRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function readNumber(record: JsonRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function readArray(record: JsonRecord, key: string) {
  const value = record[key];
  if (!Array.isArray(value)) return [];

  return value.map(toRecord).filter((item) => Object.keys(item).length > 0);
}

function parseResultArray(value: unknown) {
  if (Array.isArray(value)) return value.map(toRecord);

  const record = toRecord(value);
  const result = record.result;
  if (Array.isArray(result)) return result.map(toRecord);

  return [];
}

function formatRawUnits(rawValue: string, decimals = 18) {
  const normalized = rawValue.replace(/[^\d]/g, '').replace(/^0+/, '') || '0';
  if (!normalized) return '0';

  if (decimals <= 0) return normalized;

  if (normalized.length <= decimals) {
    const fraction = normalized.padStart(decimals, '0').replace(/0+$/, '');
    return fraction ? `0.${fraction}` : '0';
  }

  const whole = normalized.slice(0, normalized.length - decimals);
  const fraction = normalized.slice(normalized.length - decimals).replace(/0+$/, '');

  return fraction ? `${whole}.${fraction}` : whole;
}

function formatDisplayAmount(amount: number, fallback: string) {
  if (!Number.isFinite(amount) || amount === 0) return '0';

  if (amount >= 1) {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: amount >= 1000 ? 2 : 4,
    });
  }

  const [whole, fraction = ''] = fallback.split('.');
  const trimmedFraction = fraction.slice(0, 8).replace(/0+$/, '');
  return `${whole || '0'}${trimmedFraction ? `.${trimmedFraction}` : ''}`;
}

function coinIdForToken(symbol: string, chainId: string, isNative = false) {
  const normalized = symbol.toUpperCase();

  if (isNative) {
    if (chainId === 'polygon') return 'polygon-ecosystem-token';
    if (chainId === 'bnb') return 'binancecoin';
    return 'ethereum';
  }

  const commonTokens: Record<string, string> = {
    AAVE: 'aave',
    ARB: 'arbitrum',
    BNB: 'binancecoin',
    BTCB: 'bitcoin',
    DAI: 'dai',
    ETH: 'ethereum',
    LINK: 'chainlink',
    POL: 'polygon-ecosystem-token',
    MATIC: 'matic-network',
    UNI: 'uniswap',
    USDC: 'usd-coin',
    USDT: 'tether',
    WBTC: 'bitcoin',
    WETH: 'ethereum',
    WMATIC: 'matic-network',
  };

  return commonTokens[normalized];
}

function calculateChangePercentage(balance: number, change: number) {
  const previous = balance - change;
  if (!Number.isFinite(previous) || previous <= 0) return 0;

  return (change / previous) * 100;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
}

function isLargeWalletTokenError(error: unknown, chain: SupportedChainConfig) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('too many erc20 token balances') ||
    (message.includes('too many') && message.includes(chain.moralisChain.toLowerCase()))
  );
}

function syncWarning(
  walletAddress: string,
  chain: SupportedChainConfig,
  message: string,
): WalletSyncWarning {
  return {
    walletAddress,
    chainId: chain.id,
    chainName: chain.name,
    message,
  };
}

function largeWalletWarningMessage(chain: SupportedChainConfig) {
  return `${chain.name} token balances were skipped because this wallet is too large for Moralis token balance sync.`;
}

async function fetchNativeAsset(
  address: string,
  chain: SupportedChainConfig,
): Promise<PortfolioAsset | null> {
  const balanceResponse = toRecord(
    await moralisGet(`/${address}/balance`, {
      chain: chain.moralisChain,
    }),
  );

  const rawBalance = readString(balanceResponse, ['balance'], '0');
  const amountFormatted = formatRawUnits(rawBalance, chain.nativeDecimals);
  const amountNumber = Number(amountFormatted);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) return null;

  let priceUsd = 0;
  let priceChange24h: number | null = null;

  try {
    const priceResponse = toRecord(
      await moralisGet(`/erc20/${chain.wrappedNativeAddress}/price`, {
        chain: chain.moralisChain,
        include: 'percent_change',
      }),
    );

    priceUsd = readNumber(priceResponse, ['usdPrice', 'usd_price', 'price'], 0);
    const change = readNumber(
      priceResponse,
      ['24hrPercentChange', 'usdPrice24hrPercentChange', 'usd_price_24hr_percent_change'],
      Number.NaN,
    );
    priceChange24h = Number.isFinite(change) ? change : null;
  } catch {
    priceUsd = 0;
  }

  const valueUsd = amountNumber * priceUsd;
  const valueChange24hUsd =
    priceChange24h === null ? 0 : valueUsd - valueUsd / (1 + priceChange24h / 100);

  const asset: PortfolioAsset = {
    id: `${chain.id}:native`,
    chainId: chain.id,
    chainName: chain.name,
    tokenAddress: 'native',
    name: chain.nativeName,
    symbol: chain.nativeSymbol,
    amount: formatDisplayAmount(amountNumber, amountFormatted),
    amountNumber,
    priceUsd,
    valueUsd,
    priceChange24h,
    valueChange24hUsd,
    allocation: 0,
    coinId: coinIdForToken(chain.nativeSymbol, chain.id, true),
    isNative: true,
  };

  return asset;
}

function normalizeTokenAsset(
  rawToken: JsonRecord,
  chain: SupportedChainConfig,
): PortfolioAsset | null {
  const possibleSpam = rawToken.possible_spam;
  if (possibleSpam === true) return null;

  const tokenAddress = readString(rawToken, ['token_address', 'address', 'contract_address']);
  const symbol = readString(rawToken, ['symbol', 'token_symbol'], 'TOKEN').toUpperCase();
  const name = readString(rawToken, ['name', 'token_name'], symbol);
  const decimals = readNumber(rawToken, ['decimals', 'token_decimals'], 18);
  const rawBalance = readString(rawToken, ['balance'], '0');
  const formattedFromApi = readString(rawToken, ['balance_formatted', 'formatted_balance']);
  const amountFormatted = formattedFromApi || formatRawUnits(rawBalance, decimals);
  const amountNumber = Number(amountFormatted);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) return null;

  const priceUsd = readNumber(rawToken, ['usd_price', 'usdPrice', 'price'], 0);
  const valueUsd = readNumber(
    rawToken,
    ['usd_value', 'usdValue', 'balance_usd', 'value_usd'],
    amountNumber * priceUsd,
  );
  const priceChange = readNumber(
    rawToken,
    [
      'usd_price_24hr_percent_change',
      'usd_price_24h_percent_change',
      'usd_value_24hr_percent_change',
      '24hrPercentChange',
    ],
    Number.NaN,
  );
  const priceChange24h = Number.isFinite(priceChange) ? priceChange : null;
  const valueChange24hUsd = readNumber(
    rawToken,
    ['usd_value_24hr_usd_change', 'usd_value_24h_usd_change'],
    priceChange24h === null ? 0 : valueUsd - valueUsd / (1 + priceChange24h / 100),
  );

  const asset: PortfolioAsset = {
    id: `${chain.id}:${tokenAddress || symbol}`,
    chainId: chain.id,
    chainName: chain.name,
    tokenAddress,
    name,
    symbol,
    amount: formatDisplayAmount(amountNumber, amountFormatted),
    amountNumber,
    priceUsd,
    valueUsd,
    priceChange24h,
    valueChange24hUsd,
    allocation: 0,
    coinId: coinIdForToken(symbol, chain.id),
    isNative: false,
  };

  return asset;
}

async function fetchTokenAssets(
  address: string,
  chain: SupportedChainConfig,
): Promise<PortfolioAsset[]> {
  const response = await moralisGet<unknown>(`/wallets/${address}/tokens`, {
    chain: chain.moralisChain,
    exclude_spam: true,
    exclude_unverified_contracts: true,
  });

  return parseResultArray(response)
    .map((token) => normalizeTokenAsset(token, chain))
    .filter((token): token is PortfolioAsset => Boolean(token));
}

async function fetchChainAssets(
  address: string,
  chain: SupportedChainConfig,
): Promise<ChainAssetResult> {
  const [nativeAssetResult, tokenAssetsResult] = await Promise.allSettled([
    fetchNativeAsset(address, chain),
    fetchTokenAssets(address, chain),
  ]);

  const assets: PortfolioAsset[] = [];
  const warnings: WalletSyncWarning[] = [];

  if (nativeAssetResult.status === 'fulfilled') {
    if (nativeAssetResult.value) assets.push(nativeAssetResult.value);
  } else {
    throw nativeAssetResult.reason;
  }

  if (tokenAssetsResult.status === 'fulfilled') {
    assets.push(...tokenAssetsResult.value);
  } else {
    if (!isLargeWalletTokenError(tokenAssetsResult.reason, chain)) {
      throw tokenAssetsResult.reason;
    }

    warnings.push(syncWarning(address, chain, largeWalletWarningMessage(chain)));
  }

  return {
    chain,
    assets,
    warnings,
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

export async function getPortfolioForWallets(
  linkedWallets: LinkedWallet[],
): Promise<Omit<PortfolioResponse, 'success' | 'supportedChains'>> {
  if (USE_DUMMY_DATA) {
    return getMockPortfolio(linkedWallets);
  }

  const wallets = await Promise.all(
    linkedWallets.map(async (wallet) => {
      const chains = wallet.chains.length
        ? wallet.chains
        : SUPPORTED_CHAINS.map((chain) => chain.id);

      const chainAssets = await Promise.all(
        SUPPORTED_CHAINS.filter((chain) => chains.includes(chain.id)).map((chain) =>
          fetchChainAssets(wallet.address, chain),
        ),
      );

      const assets = chainAssets.flatMap(({ assets: chainAssetList }) => chainAssetList);
      const syncWarnings = chainAssets.flatMap(({ warnings }) => warnings);
      const balanceUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
      const change24hUsd = assets.reduce((sum, asset) => sum + asset.valueChange24hUsd, 0);

      const walletAssets = withAllocations(assets, balanceUsd);

      return {
        ...wallet,
        balanceUsd,
        change24hUsd,
        changePercentage24h: calculateChangePercentage(balanceUsd, change24hUsd),
        assetCount: assets.length,
        assets: walletAssets,
        chainBreakdown: chainAssets.map(({ chain, assets: chainAssetList }) => ({
          chainId: chain.id,
          chainName: chain.name,
          balanceUsd: chainAssetList.reduce((sum, asset) => sum + asset.valueUsd, 0),
          assetCount: chainAssetList.length,
        })),
        syncWarnings,
      } satisfies PortfolioWallet;
    }),
  );

  const allAssets = wallets.flatMap((wallet) => wallet.assets);
  const syncWarnings = wallets.flatMap((wallet) => wallet.syncWarnings);
  const totalBalanceUsd = wallets.reduce((sum, wallet) => sum + wallet.balanceUsd, 0);
  const change24hUsd = wallets.reduce((sum, wallet) => sum + wallet.change24hUsd, 0);
  const bestPerformer =
    allAssets
      .filter((asset) => asset.priceChange24h !== null)
      .sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0))[0] ?? null;

  return {
    summary: {
      totalBalanceUsd,
      change24hUsd,
      changePercentage24h: calculateChangePercentage(totalBalanceUsd, change24hUsd),
      walletCount: linkedWallets.length,
      assetCount: allAssets.length,
      bestPerformer: bestPerformer
        ? {
            name: bestPerformer.name,
            symbol: bestPerformer.symbol,
            priceChange24h: bestPerformer.priceChange24h ?? 0,
          }
        : null,
    },
    wallets,
    topAssets: withAllocations(allAssets, totalBalanceUsd).slice(0, 6),
    syncWarnings,
  };
}

function transactionTypeFromHistory(
  rawTransaction: JsonRecord,
  walletAddress: string,
): Pick<WalletTransaction, 'type' | 'status'> {
  const summary = readString(rawTransaction, ['summary', 'category', 'type']).toLowerCase();
  const erc20Transfers = readArray(rawTransaction, 'erc20_transfers');
  const nativeTransfers = readArray(rawTransaction, 'native_transfers');
  const nftTransfers = readArray(rawTransaction, 'nft_transfers');

  if (summary.includes('swap')) return { type: 'Swap', status: 'swap' };
  if (nftTransfers.length > 0) return { type: 'NFT Transfer', status: 'nft' };

  const transfer = erc20Transfers[0] || nativeTransfers[0] || rawTransaction;
  const fromAddress = readString(transfer, ['from_address', 'from']);
  const toAddress = readString(transfer, ['to_address', 'to']);
  const normalizedWallet = walletAddress.toLowerCase();

  if (fromAddress.toLowerCase() === normalizedWallet) return { type: 'Send', status: 'send' };
  if (toAddress.toLowerCase() === normalizedWallet) return { type: 'Receive', status: 'receive' };

  return { type: 'Transfer', status: 'transfer' };
}

function transactionAssetFromHistory(
  rawTransaction: JsonRecord,
  chain: SupportedChainConfig,
): Pick<WalletTransaction, 'asset' | 'symbol' | 'amount' | 'valueUsd'> {
  const erc20Transfer = readArray(rawTransaction, 'erc20_transfers')[0];
  const nativeTransfer = readArray(rawTransaction, 'native_transfers')[0];
  const nftTransfer = readArray(rawTransaction, 'nft_transfers')[0];

  if (erc20Transfer) {
    const symbol = readString(erc20Transfer, ['token_symbol', 'symbol'], 'TOKEN').toUpperCase();
    const decimals = readNumber(erc20Transfer, ['token_decimals', 'decimals'], 18);
    const amountFormatted =
      readString(erc20Transfer, ['value_formatted', 'value_decimal']) ||
      formatRawUnits(readString(erc20Transfer, ['value'], '0'), decimals);

    return {
      asset: readString(erc20Transfer, ['token_name', 'name'], symbol),
      symbol,
      amount: formatDisplayAmount(Number(amountFormatted), amountFormatted),
      valueUsd: readNumber(erc20Transfer, ['value_usd', 'usd_value'], Number.NaN),
    };
  }

  if (nativeTransfer) {
    const amountFormatted =
      readString(nativeTransfer, ['value_formatted', 'value_decimal']) ||
      formatRawUnits(readString(nativeTransfer, ['value'], '0'), chain.nativeDecimals);

    return {
      asset: chain.nativeName,
      symbol: chain.nativeSymbol,
      amount: formatDisplayAmount(Number(amountFormatted), amountFormatted),
      valueUsd: readNumber(nativeTransfer, ['value_usd', 'usd_value'], Number.NaN),
    };
  }

  if (nftTransfer) {
    return {
      asset: readString(nftTransfer, ['token_name', 'name'], 'NFT'),
      symbol: readString(nftTransfer, ['token_symbol', 'symbol'], 'NFT').toUpperCase(),
      amount: readString(nftTransfer, ['amount'], '1'),
      valueUsd: null,
    };
  }

  const value = readString(rawTransaction, ['value'], '0');
  const amountFormatted = value === '0' ? '0' : formatRawUnits(value, chain.nativeDecimals);

  return {
    asset: chain.nativeName,
    symbol: chain.nativeSymbol,
    amount: formatDisplayAmount(Number(amountFormatted), amountFormatted),
    valueUsd: readNumber(rawTransaction, ['value_usd', 'usd_value'], Number.NaN),
  };
}

function normalizeHistoryItem(
  rawTransaction: JsonRecord,
  wallet: LinkedWallet,
  chain: SupportedChainConfig,
  index: number,
): WalletTransaction | null {
  const hash = readString(rawTransaction, ['hash', 'transaction_hash', 'transactionHash']);
  if (!hash) return null;

  const type = transactionTypeFromHistory(rawTransaction, wallet.address);
  const asset = transactionAssetFromHistory(rawTransaction, chain);
  const timestamp = readString(rawTransaction, ['block_timestamp', 'blockTimestamp', 'createdAt']);
  const valueUsd = Number.isFinite(asset.valueUsd) ? asset.valueUsd : null;

  const transaction: WalletTransaction = {
    id: `${chain.id}:${hash}:${index}`,
    hash,
    chainId: chain.id,
    chainName: chain.name,
    walletAddress: wallet.address,
    walletLabel: wallet.label,
    ...type,
    ...asset,
    valueUsd,
    timestamp,
    explorerUrl: getExplorerTxUrl(chain.id, hash),
    summary: readString(rawTransaction, ['summary'], `${type.type} ${asset.symbol}`),
  };

  return transaction;
}

async function fetchChainHistory(
  wallet: LinkedWallet,
  chain: SupportedChainConfig,
  targetCount: number,
): Promise<ChainHistoryPage> {
  const transactions: WalletTransaction[] = [];
  let cursor = '';
  let page = 0;
  let hasMore = false;

  do {
    const response = await moralisGet<unknown>(`/wallets/${wallet.address}/history`, {
      chain: chain.moralisChain,
      order: 'DESC',
      limit: Math.min(MORALIS_HISTORY_PAGE_LIMIT, Math.max(targetCount - transactions.length, 1)),
      cursor,
    });
    const responseRecord = toRecord(response);
    const nextTransactions = parseResultArray(response)
      .map((transaction, index) =>
        normalizeHistoryItem(transaction, wallet, chain, transactions.length + index),
      )
      .filter((transaction): transaction is WalletTransaction => Boolean(transaction));

    transactions.push(...nextTransactions);
    cursor = readString(responseRecord, ['cursor']);
    page += 1;
    hasMore = Boolean(cursor);
  } while (cursor && transactions.length < targetCount && page < MAX_HISTORY_PAGES_PER_CHAIN);

  return {
    transactions,
    hasMore,
  };
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesFilters(transaction: WalletTransaction, filters: TransactionFilters) {
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

export async function getTransactionsForWallets(
  linkedWallets: LinkedWallet[],
  filters: TransactionFilters = {},
): Promise<Omit<TransactionsResponse, 'success' | 'wallets'>> {
  if (USE_DUMMY_DATA) {
    return getMockTransactions(linkedWallets, filters);
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
  const requestedWindow = page * limit + limit;
  const needsDeeperScan = Boolean(
    filters.search?.trim() ||
    filters.type?.trim() ||
    filters.from ||
    filters.to ||
    filters.wallet?.trim(),
  );
  const fetchLimit = Math.min(
    needsDeeperScan ? Math.max(requestedWindow, MORALIS_HISTORY_PAGE_LIMIT) : requestedWindow,
    MAX_HISTORY_ITEMS_PER_CHAIN,
  );

  const transactionsByWallet = await Promise.all(
    linkedWallets.map(async (wallet) => {
      const chains = wallet.chains.length
        ? wallet.chains
        : SUPPORTED_CHAINS.map((chain) => chain.id);

      const chainHistorySettled = await Promise.allSettled(
        SUPPORTED_CHAINS.filter((chain) => chains.includes(chain.id)).map((chain) =>
          fetchChainHistory(wallet, chain, fetchLimit),
        ),
      );

      return chainHistorySettled.flatMap((result) => {
        if (result.status === 'fulfilled') return [result.value];
        throw result.reason;
      });
    }),
  );

  const historyPages = transactionsByWallet.flat();
  const filteredTransactions = historyPages
    .flatMap((historyPage) => historyPage.transactions)
    .flat()
    .filter((transaction) => matchesFilters(transaction, filters))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const start = (page - 1) * limit;
  const pageTransactions = filteredTransactions.slice(start, start + limit);
  const hasMoreFilteredRows = filteredTransactions.length > start + limit;
  const hasMoreSourceHistory =
    historyPages.some((historyPage) => historyPage.hasMore) && pageTransactions.length === limit;
  const total = hasMoreSourceHistory
    ? Math.max(filteredTransactions.length, start + pageTransactions.length + 1)
    : filteredTransactions.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    transactions: pageTransactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: hasMoreFilteredRows || hasMoreSourceHistory,
      hasPreviousPage: page > 1,
    },
  };
}

export function supportedChainsForApi() {
  return SUPPORTED_CHAINS.map((chain) => ({
    id: chain.id,
    name: chain.name,
    shortName: chain.shortName,
  }));
}

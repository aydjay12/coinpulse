'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import NavLink from '@/components/NavLink';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import ClientTable from '@/components/ClientTable';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';
import RouteLoading from '@/components/RouteLoading';
import type { PortfolioAsset, WalletDetailResponse } from '@/lib/wallets/types';
import '../portfolio.css';
import AppPagination from '@/components/AppPagination';

const ITEMS_PER_PAGE = 10;

type WalletDetailApiResponse =
  | WalletDetailResponse
  | {
      success: false;
      message?: string;
    };

export default function WalletDetailsPage() {
  const params = useParams();
  const address = params.walletAddress as string;
  const [walletDetail, setWalletDetail] = useState<WalletDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadWallet = useCallback(
    async (signal?: AbortSignal) => {
      if (!address) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/portfolio/${address}`, { signal });
        const data = (await response.json()) as WalletDetailApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            'message' in data ? data.message || 'Failed to load wallet' : 'Failed to load wallet',
          );
        }

        setWalletDetail(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load wallet');
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [address],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadWallet(controller.signal);

    return () => controller.abort();
  }, [loadWallet]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const columns: DataTableColumn<PortfolioAsset>[] = [
    {
      header: 'Asset',
      cellClassName: 'token-cell',
      cell: (asset) => (
        <div className="token-info">
          <div className="wallet-token-avatar">{asset.symbol.slice(0, 2)}</div>
          <div className="flex flex-col">
            <span className="font-bold text-white">{asset.name}</span>
            <span className="text-xs text-muted-foreground uppercase">
              {asset.symbol} · {asset.chainName}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Balance',
      cellClassName: 'price-cell',
      cell: (asset) => (
        <div className="flex flex-col">
          <span className="font-bold text-white">
            {asset.amount} {asset.symbol}
          </span>
          <span className="text-xs text-muted-foreground">
            Price: {formatCurrency(asset.priceUsd)}
          </span>
        </div>
      ),
    },
    {
      header: 'Value',
      cellClassName: 'price-cell',
      cell: (asset) => (
        <span className="font-bold text-white">{formatCurrency(asset.valueUsd)}</span>
      ),
    },
    {
      header: '24h Change',
      cellClassName: 'change-cell',
      cell: (asset) => {
        const change = asset.priceChange24h ?? 0;
        const isUp = change >= 0;
        return (
          <span
            className={cn(
              'flex items-center gap-1 font-bold',
              isUp ? 'text-green-500' : 'text-red-500',
            )}
          >
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPercentage(Math.abs(change))}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return <RouteLoading label="Loading wallet assets..." />;
  }

  if (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center w-full">
        <ErrorState
          title="Wallet Data Offline"
          message={error}
          onRetry={() => loadWallet()}
          className="w-full"
        />
      </main>
    );
  }

  if (!walletDetail) return null;

  const { wallet } = walletDetail;
  const isUp = wallet.change24hUsd >= 0;
  const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const hasTrackedAssets = wallet.assetCount > 0 || wallet.balanceUsd > 0;

  const totalPages = Math.ceil(wallet.assets.length / ITEMS_PER_PAGE);
  const paginatedAssets = wallet.assets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="main-container portfolio-container">
      <NavLink href="/portfolio" className="link-btn mb-8 inline-flex items-center gap-2">
        <ArrowLeft size={18} /> Back to Portfolio
      </NavLink>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white">
              {wallet.label}
            </h1>
            {wallet.chainBreakdown.map((chain) => (
              <span
                key={chain.chainId}
                className="badge badge-primary"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--color-brand-blue)',
                  fontSize: '0.75rem',
                }}
              >
                {chain.chainName}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground font-mono bg-white/5 px-3 py-1.5 rounded-lg w-fit max-w-full">
            <span className="truncate max-w-[160px] sm:max-w-none">{wallet.address}</span>
            <button
              type="button"
              onClick={copyAddress}
              className="hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Copy wallet address"
            >
              <Copy size={14} />
            </button>
            <a
              href={wallet.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors shrink-0"
              aria-label="Open wallet on block explorer"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div className="details-info text-right">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Current Balance
          </span>
          <div className="text-4xl font-black text-white">{formatCurrency(wallet.balanceUsd)}</div>
          {hasTrackedAssets ? (
            <div
              className={`details-info-change font-bold flex items-center justify-end gap-1 mt-1 ${
                isUp ? 'text-green-500' : 'text-red-500'
              }`}
            >
              <ChangeIcon size={18} /> {isUp ? '+' : '-'}
              {formatCurrency(Math.abs(wallet.change24hUsd))} (
              {formatPercentage(Math.abs(wallet.changePercentage24h))})
            </div>
          ) : (
            <div className="details-info-change text-muted-foreground font-bold flex items-center justify-end gap-1 mt-1">
              No tracked balances found.
            </div>
          )}
        </div>
      </header>

      {wallet.syncWarnings.length > 0 ? (
        <div className="portfolio-sync-warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Partial wallet sync</strong>
            <span>{wallet.syncWarnings.map((warning) => warning.message).join(' ')}</span>
          </div>
        </div>
      ) : null}

      <div
        id="assets-card"
        className="glass-card scroll-mt-header rounded-3xl p-0 overflow-hidden neon-glow-blue animate-in fade-in slide-in-from-bottom-8 duration-700"
      >
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <h4 className="wallet-assets-title text-xl font-bold flex items-center gap-2 text-white">
            <span className="p-1.5 glass-card rounded-lg bg-brand-blue/10 text-brand-blue">
              <Wallet size={20} />
            </span>
            Wallet Assets ({wallet.assets.length})
          </h4>
        </div>

        {wallet.assets.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            No token balances found for this wallet on supported networks.
          </div>
        ) : (
          <>
            <ClientTable
              tableClassName="coins-table border-0"
              columns={columns}
              data={paginatedAssets}
              rowKey={(asset) => `${asset.chainId}-${asset.tokenAddress}-${asset.symbol}`}
              rowHref={(asset) => (asset.coinId ? `/coins/${asset.coinId}` : undefined)}
              rowAriaLabel={(asset) => `View ${asset.name}`}
              headerCellClassName="bg-transparent!"
              bodyCellClassName="border-white/5"
            />

            {totalPages > 1 && (
              <div className="p-6 border-t border-white/10 bg-white/5">
                <AppPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hasMorePages={currentPage < totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

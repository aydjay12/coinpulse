'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  ArrowRight,
  ShieldCheck,
  History,
  AlertTriangle,
} from 'lucide-react';
import NavLink from '@/components/NavLink';
import ErrorState from '@/components/ErrorState';
import RouteLoading from '@/components/RouteLoading';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { PortfolioResponse } from '@/lib/wallets/types';
import './portfolio.css';
import '../dashboard/dashboard.css';

type PortfolioApiResponse =
  | PortfolioResponse
  | {
      success: false;
      message?: string;
    };

function displayAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWalletCount(count: number) {
  return `${count} ${count === 1 ? 'Address' : 'Addresses'}`;
}

function formatTokenCount(count: number) {
  return `${count} ${count === 1 ? 'Token' : 'Tokens'}`;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio', { signal });
      const data = (await response.json()) as PortfolioApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          'message' in data
            ? data.message || 'Failed to load portfolio'
            : 'Failed to load portfolio',
        );
      }

      setPortfolio(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPortfolio(controller.signal);

    return () => controller.abort();
  }, [loadPortfolio]);

  if (isLoading) {
    return <RouteLoading label="Loading portfolio..." />;
  }

  if (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center w-full">
        <ErrorState
          title="Portfolio Data Offline"
          message={error}
          onRetry={() => loadPortfolio()}
          className="w-full"
        />
      </main>
    );
  }

  if (!portfolio || portfolio.wallets.length === 0) {
    return (
      <div className="main-container portfolio-container">
        <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
            Investment <span className="brand-gradient-text">Intelligence</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl font-medium">
            A combined overview of your linked wallet positions and asset allocations.
          </p>
        </header>

        <div className="portfolio-empty-state-card glass-card rounded-3xl p-20 text-center border border-dashed border-white/10 relative overflow-hidden group neon-glow-purple animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-blue/10 text-brand-blue shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-500">
              <Wallet size={36} />
            </div>

            <h2 className="text-3xl font-extrabold text-white mb-3">Wallet not linked yet</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10 leading-relaxed">
              Add an EVM address to start syncing balances, allocations, and wallet history across
              all decentralized protocols.
            </p>

            <div className="flex justify-center">
              <NavLink
                href="/connect-wallet"
                className="dash-btn dash-btn-primary px-10 py-4 text-lg transform hover:scale-100 active:scale-95 transition-all shadow-lg hover:shadow-brand-blue/20"
                style={{ textDecoration: 'none' }}
              >
                <Wallet size={20} />
                <span>Connect Wallet</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, topAssets, wallets } = portfolio;
  const isUp = summary.change24hUsd >= 0;
  const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const hasTrackedAssets = summary.assetCount > 0 || summary.totalBalanceUsd > 0;

  return (
    <div className="main-container portfolio-container">
      <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
          Investment <span className="brand-gradient-text">Intelligence</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl font-medium">
          A combined overview of your linked wallet positions and asset allocations.
        </p>
      </header>

      <div className="portfolio-overview-card animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="portfolio-overview-content">
          <span className="portfolio-total-label">Combined Net Worth</span>
          <div className="portfolio-total-value">{formatCurrency(summary.totalBalanceUsd)}</div>
          <div className="flex items-center gap-4">
            {hasTrackedAssets ? (
              <div
                className={`flex items-center gap-1.5 font-bold text-xl ${
                  isUp ? 'text-green-500' : 'text-red-500'
                }`}
              >
                <ChangeIcon size={24} />
                {isUp ? '+' : '-'}
                {formatCurrency(Math.abs(summary.change24hUsd))} (
                {formatPercentage(Math.abs(summary.changePercentage24h))})
              </div>
            ) : (
              <div className="font-bold text-xl text-muted-foreground">
                No tracked balances found.
              </div>
            )}
            <span className="text-muted-foreground font-medium">
              {hasTrackedAssets ? 'past 24 hours' : ''}
            </span>
          </div>
          {/* 
          {hasTrackedAssets ? null : (
            <div className="dashboard-empty-wallet dashboard-empty-assets mt-8">
              <div className="dashboard-empty-wallet-icon">
                <Coins size={26} />
              </div>
              <div className="dashboard-empty-wallet-copy">
                <h2>Wallet connected, no tracked assets found</h2>
                <p>
                  Moralis did not return supported token or native balances for your linked
                  addresses yet.
                </p>
              </div>
            </div>
          )} */}

          <div className="portfolio-stats-grid mt-10">
            <div className="portfolio-stat-box">
              <span className="portfolio-stat-label">Total Assets</span>
              <span className="portfolio-stat-value">{formatTokenCount(summary.assetCount)}</span>
            </div>
            <div className="portfolio-stat-box">
              <span className="portfolio-stat-label">Wallets Connected</span>
              <span className="portfolio-stat-value">{formatWalletCount(summary.walletCount)}</span>
            </div>
            <div className="portfolio-stat-box">
              <span className="portfolio-stat-label">Best Performer</span>
              <span className="portfolio-stat-value" style={{ color: 'var(--color-green-500)' }}>
                {summary.bestPerformer
                  ? `${summary.bestPerformer.symbol} (+${formatPercentage(summary.bestPerformer.priceChange24h)})`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {portfolio.syncWarnings.length > 0 ? (
        <div className="portfolio-sync-warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Partial wallet sync</strong>
            <span>{portfolio.syncWarnings.map((warning) => warning.message).join(' ')}</span>
          </div>
        </div>
      ) : null}

      <div className="mb-16">
        <div className="portfolio-assets-header">
          <h2 className="portfolio-assets-title">Top Allocations</h2>
          <NavLink href="/transactions" className="dash-btn mobile-dash-btn">
            <History size={18} /> Transactions
          </NavLink>
        </div>

        {topAssets.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
            No token balances found across linked wallets.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topAssets.map((asset, i) => (
              <div
                key={`${asset.chainId}-${asset.tokenAddress}-${asset.symbol}`}
                className="glass-card p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {asset.name}
                  </span>
                  <span className="badge badge-up">{asset.allocation.toFixed(1)}%</span>
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {formatCurrency(asset.valueUsd)}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {asset.amount} {asset.symbol}
                </div>
                <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue"
                    style={{ width: `${Math.min(asset.allocation, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <div className="portfolio-assets-header">
          <h2 className="portfolio-assets-title">Wallets</h2>
          <NavLink href="/connect-wallet" className="dash-btn mobile-dash-btn">
            <Wallet size={18} /> Add Wallet
          </NavLink>
        </div>

        <div className="wallets-breakdown">
          {wallets.map((wallet) => (
            <NavLink
              key={wallet.id}
              href={`/portfolio/${wallet.address}`}
              className="wallet-card-link"
            >
              <div className="wallet-item-card animate-in fade-in slide-in-from-bottom-10 group">
                <div className="wallet-card-primary-info">
                  <div className="wallet-card-type">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="wallet-card-details text-left">
                    <span className="block font-bold text-white text-xl">{wallet.label}</span>
                    <span className="wallet-card-addr">{displayAddress(wallet.address)}</span>
                  </div>
                </div>
                <div className="wallet-card-secondary-info text-right">
                  <div className="wallet-card-balance">{formatCurrency(wallet.balanceUsd)}</div>
                  <div className="wallet-asset-count">
                    <Coins size={16} /> {formatTokenCount(wallet.assetCount)} Tracked
                    <ArrowRight
                      size={16}
                      className="ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

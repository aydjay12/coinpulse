'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import ErrorState from '@/components/ErrorState';
import RouteLoading from '@/components/RouteLoading';
import {
  Wallet,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  TrendingUp,
  History,
  Activity,
  ArrowLeft,
  Repeat2,
  ImageIcon,
} from 'lucide-react';
import { formatCurrency, formatPercentage, timeAgo } from '@/lib/utils';
import type { DashboardResponse, WalletTransaction } from '@/lib/wallets/types';
import './dashboard.css';

type DashboardApiResponse =
  | DashboardResponse
  | {
      success: false;
      message?: string;
    };

type PortfolioSeriesPoint = DashboardResponse['portfolioSeries'][number];

function getTransactionIcon(status: WalletTransaction['status']) {
  switch (status) {
    case 'send':
      return <ArrowLeft size={18} />;
    case 'receive':
      return <ArrowRight size={18} />;
    case 'swap':
      return <Repeat2 size={18} />;
    case 'nft':
      return <ImageIcon size={18} />;
    case 'transfer':
      return <Activity size={18} />;
    default:
      return <History size={18} />;
  }
}

function formatRelativeDate(date: string) {
  const relative = timeAgo(date);
  return relative === 'just now' ? relative : `${relative} ago`;
}

function formatWalletCount(count: number) {
  return `${count} ${count === 1 ? 'Address' : 'Addresses'}`;
}

function buildChartPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function PortfolioTrendChart({
  points,
  hasWallets,
  hasTrackedAssets,
}: {
  points: PortfolioSeriesPoint[];
  hasWallets: boolean;
  hasTrackedAssets: boolean;
}) {
  if (!hasWallets) {
    return (
      <div className="dashboard-chart-empty">
        <span>No portfolio data yet</span>
      </div>
    );
  }

  if (!hasTrackedAssets) {
    return (
      <div className="dashboard-chart-empty">
        <span>No tracked balances found for this wallet yet</span>
      </div>
    );
  }

  if (points.length < 2) {
    return (
      <div className="dashboard-chart-empty">
        <span>Portfolio history will appear after another sync</span>
      </div>
    );
  }

  const width = 640;
  const height = 170;
  const paddingX = 22;
  const paddingY = 18;
  const values = points.map((point) => point.totalBalanceUsd);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || Math.max(maxValue, 1);
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const scaledPoints = points.map((point, index) => {
    const x =
      points.length === 1 ? width / 2 : paddingX + (index / (points.length - 1)) * chartWidth;
    const y = paddingY + (1 - (point.totalBalanceUsd - minValue) / valueRange) * chartHeight;

    return { x, y };
  });
  const linePath = buildChartPath(scaledPoints);
  const areaPath =
    scaledPoints.length > 1
      ? `${linePath} L ${scaledPoints[scaledPoints.length - 1].x} ${height - paddingY} L ${
          scaledPoints[0].x
        } ${height - paddingY} Z`
      : '';

  return (
    <div className="dashboard-chart-shell">
      <svg
        className="dashboard-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Portfolio value history"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="dashboard-chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-purple)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--color-brand-purple)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((line) => {
          const y = paddingY + (line / 2) * chartHeight;
          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="dashboard-chart-grid-line"
            />
          );
        })}
        {areaPath ? <path d={areaPath} className="dashboard-chart-area" /> : null}
        <path d={linePath} className="dashboard-chart-line" />
        {scaledPoints.map((point, index) => (
          <circle
            key={`${points[index].timestamp}-${index}`}
            cx={point.x}
            cy={point.y}
            r={points.length === 1 || index === scaledPoints.length - 1 ? 4 : 2.5}
            className="dashboard-chart-point"
          />
        ))}
      </svg>
      <div className="dashboard-chart-labels">
        <span>{formatCurrency(minValue, 0)}</span>
        <span>{formatCurrency(maxValue, 0)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard', { signal });
      const data = (await response.json()) as DashboardApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          'message' in data
            ? data.message || 'Failed to load dashboard'
            : 'Failed to load dashboard',
        );
      }

      setDashboard(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  if (isLoading) {
    return <RouteLoading label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center w-full">
        <ErrorState
          title="Dashboard Offline"
          message={error}
          onRetry={() => loadDashboard()}
          className="w-full"
        />
      </main>
    );
  }

  if (!dashboard) return null;

  const portfolio = dashboard.portfolio;
  const isUp = portfolio.change24hUsd >= 0;
  const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const hasWallets = dashboard.walletStats.connectedWallets > 0;
  const hasTrackedAssets = dashboard.walletStats.trackedAssets > 0 || portfolio.totalBalanceUsd > 0;

  return (
    <div className="main-container dashboard-container stagger-container">
      <header className="dashboard-header animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="dashboard-title-group">
          <h1>Welcome, {dashboard.user.username || 'Trader'}</h1>
          <p>Here&apos;s what&apos;s happening with your assets today.</p>
        </div>
        <div className="dashboard-actions">
          <NavLink href="/connect-wallet" className="dash-btn">
            <Wallet size={18} /> Connect Wallet
          </NavLink>
          <NavLink href="/watchlist" className="dash-btn dash-btn-primary">
            <Star size={18} /> View Watchlist
          </NavLink>
        </div>
      </header>

      {!hasWallets ? (
        <section className="dash-card dashboard-empty-wallet animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="dashboard-empty-wallet-icon">
            <Wallet size={26} />
          </div>
          <div className="dashboard-empty-wallet-copy">
            <h2>No wallet connected</h2>
            <p>Link an EVM address to unlock portfolio balance, activity, and wallet stats.</p>
          </div>
          <NavLink href="/connect-wallet" className="dash-btn dash-btn-primary">
            <Wallet size={18} /> Connect Wallet
          </NavLink>
        </section>
      ) : null}

      {hasWallets && !hasTrackedAssets ? (
        <section className="dash-card dashboard-empty-wallet dashboard-empty-assets animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="dashboard-empty-wallet-icon">
            <Activity size={26} />
          </div>
          <div className="dashboard-empty-wallet-copy">
            <h2>Wallet connected, no tracked assets found</h2>
            <p>
              CoinPulse is watching this address, but Moralis did not return supported token or
              native balances yet.
            </p>
          </div>
        </section>
      ) : null}

      <div className="dashboard-grid">
        {hasWallets && (
          <>
            <div className="dash-card portfolio-summary animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="dash-card-header">
                <div className="dash-card-title">
                  <Activity size={20} /> Portfolio Overview
                </div>
                <NavLink href="/portfolio" className="link-btn">
                  Details <ArrowRight size={16} />
                </NavLink>
              </div>

              <div className="portfolio-value-main">
                <span className="portfolio-value-label">Total Balance</span>
                <div className="portfolio-value-amount">
                  {formatCurrency(portfolio.totalBalanceUsd)}
                </div>
                {hasTrackedAssets ? (
                  <div className={`portfolio-change ${isUp ? 'positive' : 'negative'}`}>
                    <ChangeIcon size={18} /> {isUp ? '+' : '-'}
                    {formatCurrency(Math.abs(portfolio.change24hUsd))} (
                    {formatPercentage(Math.abs(portfolio.changePercentage24h))}){' '}
                    <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>today</span>
                  </div>
                ) : (
                  <div className="portfolio-change neutral">No tracked balances found.</div>
                )}
              </div>

              <PortfolioTrendChart
                points={dashboard.portfolioSeries}
                hasWallets={hasWallets}
                hasTrackedAssets={hasTrackedAssets}
              />
            </div>

            <div className="dash-card wallet-overview animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="dash-card-header">
                <div className="dash-card-title">
                  <Wallet size={20} /> Wallet Stats
                </div>
              </div>

              <div className="wallet-stats">
                <div className="wallet-stat-item">
                  <div className="wallet-stat-info">
                    <span className="wallet-stat-label">Connected Wallets</span>
                    <span className="wallet-stat-value">
                      {formatWalletCount(dashboard.walletStats.connectedWallets)}
                    </span>
                  </div>
                  <Activity size={24} style={{ opacity: 0.3 }} />
                </div>
                <div className="wallet-stat-item">
                  <div className="wallet-stat-info">
                    <span className="wallet-stat-label">Tracked Assets</span>
                    <span className="wallet-stat-value">{dashboard.walletStats.trackedAssets}</span>
                  </div>
                </div>
                <div className="wallet-stat-item">
                  <div className="wallet-stat-info">
                    <span className="wallet-stat-label">Supported Chains</span>
                    <span className="wallet-stat-value">
                      {dashboard.walletStats.supportedChains}
                    </span>
                  </div>
                </div>

                <NavLink
                  href="/connect-wallet"
                  className="dash-btn dash-btn-primary"
                  style={{ marginTop: '0.5rem', justifyContent: 'center' }}
                >
                  <Wallet size={18} /> Add Wallet
                </NavLink>
              </div>
            </div>
          </>
        )}

        <div className="dash-card watchlist-snapshot animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <TrendingUp size={20} /> Watchlist Snapshot
            </div>
          </div>

          {dashboard.watchlist.length === 0 ? (
            <div className="no-watchlist-data p-6 text-center text-muted-foreground bg-white/3 rounded-2xl">
              No saved assets yet.
            </div>
          ) : (
            <div className="mini-coin-list">
              {dashboard.watchlist.map((coin) => (
                <NavLink key={coin.id} href={`/coins/${coin.id}`} className="mini-coin-item">
                  <div className="mini-coin-info">
                    <Image
                      src={coin.image}
                      alt={coin.name}
                      width={32}
                      height={32}
                      className="mini-coin-img"
                    />
                    <div>
                      <span className="mini-coin-name">{coin.name}</span>
                      <span className="mini-coin-symbol"> {coin.symbol}</span>
                    </div>
                  </div>
                  <div className="mini-coin-market">
                    <span className="mini-coin-price">{formatCurrency(coin.price)}</span>
                    <span
                      className={`badge ${coin.change24h >= 0 ? 'badge-up' : 'badge-down'}`}
                      style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                    >
                      {coin.change24h >= 0 ? '+' : ''}
                      {formatPercentage(coin.change24h)}
                    </span>
                  </div>
                </NavLink>
              ))}
            </div>
          )}

          <div className="view-all-link">
            <NavLink href="/watchlist" className="link-btn">
              Go to Watchlist <ArrowRight size={16} />
            </NavLink>
          </div>
        </div>

        <div className="dash-card recent-transactions animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="dash-card-header recent-activities-header">
            <div className="dash-card-title">
              <History size={20} /> Recent Activities
            </div>
          </div>

          {dashboard.recentTransactions.length === 0 ? (
            <div className="no-wallet-activity p-6 text-center text-muted-foreground bg-white/3 rounded-2xl">
              {hasWallets ? 'No wallet activity found yet.' : 'Connect a wallet to sync activity.'}
            </div>
          ) : (
            <div className="tx-list">
              {dashboard.recentTransactions.map((tx) => (
                <div key={tx.id} className="tx-row">
                  <div className={`tx-icon ${tx.status}`}>{getTransactionIcon(tx.status)}</div>
                  <div className="tx-info">
                    <span className="tx-type">
                      {tx.type} {tx.symbol}
                    </span>
                    <span className="tx-date">
                      {formatRelativeDate(tx.timestamp)} - {tx.chainName}
                    </span>
                  </div>
                  <div className="tx-asset">
                    {tx.amount} {tx.symbol}
                  </div>
                  <div className="tx-amount">
                    {tx.valueUsd === null ? 'N/A' : formatCurrency(tx.valueUsd)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="view-all-link transactions-view-all-link">
            <NavLink href="/transactions" className="link-btn">
              View All History <ArrowRight size={16} />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}

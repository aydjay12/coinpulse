'use client';

import { type FormEvent, useCallback, useEffect, useState, useRef } from 'react';
import NavLink from '@/components/NavLink';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Wallet,
  History,
  Repeat2,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';
import RouteLoading from '@/components/RouteLoading';
import { formatCurrency, formatUtcTimestamp } from '@/lib/utils';
import type { TransactionsResponse } from '@/lib/wallets/types';
import './transactions.css';
import AppPagination from '@/components/AppPagination';

type TransactionsApiResponse =
  | TransactionsResponse
  | {
    success: false;
    message?: string;
  };

const TYPE_OPTIONS = [
  { value: 'All', label: 'All Types' },
  { value: 'send', label: 'Send' },
  { value: 'receive', label: 'Receive' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'swap', label: 'Swaps' },
  { value: 'nft', label: 'NFT Transfers' },
];

type TransactionCriteria = {
  search: string;
  type: string;
  wallet: string;
  from: string;
  to: string;
};

const DEFAULT_CRITERIA: TransactionCriteria = {
  search: '',
  type: 'placeholder',
  wallet: 'placeholder',
  from: '',
  to: '',
};

function hasCriteria(criteria: TransactionCriteria) {
  return Boolean(
    criteria.search.trim() ||
    (criteria.type !== 'placeholder' && criteria.type !== 'All') ||
    (criteria.wallet && criteria.wallet !== 'placeholder') ||
    criteria.from ||
    criteria.to,
  );
}

export default function TransactionsPage() {
  const [draftCriteria, setDraftCriteria] = useState<TransactionCriteria>(DEFAULT_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<TransactionCriteria>(DEFAULT_CRITERIA);
  const [page, setPage] = useState(1);
  const [filterNonce, setFilterNonce] = useState(0);
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const activeToastId = useRef<string | number | null>(null);

  const loadTransactions = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });

      if (appliedCriteria.search.trim()) params.set('search', appliedCriteria.search.trim());
      if (appliedCriteria.type !== 'All' && appliedCriteria.type !== 'placeholder') {
        params.set('type', appliedCriteria.type);
      }
      if (appliedCriteria.wallet && appliedCriteria.wallet !== 'placeholder') {
        params.set('wallet', appliedCriteria.wallet);
      }
      if (appliedCriteria.from) params.set('from', appliedCriteria.from);
      if (appliedCriteria.to) params.set('to', appliedCriteria.to);

      try {
        const response = await fetch(`/api/transactions?${params.toString()}`, { signal });
        const responseData = (await response.json()) as TransactionsApiResponse;

        if (!response.ok || !responseData.success) {
          throw new Error(
            'message' in responseData
              ? responseData.message || 'Failed to load transactions'
              : 'Failed to load transactions',
          );
        }

        setData(responseData);
        if (activeToastId.current) {
          toast.dismiss(activeToastId.current);
          activeToastId.current = null;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errorMsg = err instanceof Error ? err.message : 'Failed to load transactions';
        setError(errorMsg);
        if (activeToastId.current) {
          toast.error(errorMsg, { id: activeToastId.current });
          activeToastId.current = null;
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          isFirstLoad.current = false;
        }
      }
    },
    [appliedCriteria, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadTransactions(controller.signal);

    return () => controller.abort();
  }, [filterNonce, loadTransactions]);

  const updateDraftCriteria = (update: Partial<TransactionCriteria>) => {
    setDraftCriteria((current) => ({ ...current, ...update }));
  };

  const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setPage(1);
    setAppliedCriteria({ ...draftCriteria });
    
    // Clear any previous toast and show a new one
    if (activeToastId.current) toast.dismiss(activeToastId.current);
    activeToastId.current = toast.loading('Syncing filtered results...');
    
    setFilterNonce((current) => current + 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'send':
        return <ArrowLeft size={14} />;
      case 'receive':
        return <ArrowRight size={14} />;
      case 'swap':
        return <Repeat2 size={14} />;
      case 'nft':
        return <ImageIcon size={14} />;
      case 'transfer':
        return <ArrowUpRight size={14} />;
      default:
        return <History size={14} />;
    }
  };

  if (isLoading && !data) {
    return <RouteLoading label="Loading transactions..." />;
  }

  if (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center w-full">
        <ErrorState
          title="Transactions Offline"
          message={error}
          onRetry={() => loadTransactions()}
          className="w-full"
        />
      </main>
    );
  }

  const transactions = data?.transactions ?? [];
  const wallets = data?.wallets ?? [];
  const pagination = data?.pagination;
  const hasAppliedCriteria = hasCriteria(appliedCriteria);

  return (
    <div className="main-container transactions-container">
      <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
              Historical <span className="brand-gradient-text">Activity</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl font-medium">
              View and filter every transaction across your linked wallets.
            </p>
          </div>
        </div>

        <form
          className="filter-bar animate-in fade-in slide-in-from-bottom-4 duration-700"
          onSubmit={applyFilters}
        >
          <div className="search-field-wrap">
            <Search size={18} className="search-field-icon" />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search by asset, symbol or wallet..."
              value={draftCriteria.search}
              onChange={(e) => updateDraftCriteria({ search: e.target.value })}
            />
          </div>
          <div className="filter-controls">
            <div className="filter-select-wrap">
              <select
                className={`filter-select ${draftCriteria.type === 'placeholder' ? 'is-placeholder' : ''
                  }`}
                value={draftCriteria.type}
                onChange={(e) => updateDraftCriteria({ type: e.target.value })}
                aria-label="Filter by transaction type"
              >
                <option value="placeholder" hidden disabled>
                  Type of Activity
                </option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="filter-select-icon">
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="filter-select-wrap">
              <select
                className={`filter-select ${draftCriteria.wallet === 'placeholder' ? 'is-placeholder' : ''
                  }`}
                value={draftCriteria.wallet}
                onChange={(e) => updateDraftCriteria({ wallet: e.target.value })}
                aria-label="Filter by wallet"
              >
                <option value="placeholder" hidden disabled>
                  Source Wallet
                </option>
                <option value="">All Wallets</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.address} className="bg-slate-900">
                    {wallet.label}
                  </option>
                ))}
              </select>
              <div className="filter-select-icon">
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="filter-select-wrap">
              <input
                type="date"
                className="filter-select"
                value={draftCriteria.from}
                onChange={(e) => updateDraftCriteria({ from: e.target.value })}
                placeholder="From Date"
                aria-label="Filter from date"
              />
              <div className="filter-select-icon">
                <Calendar size={14} />
              </div>
            </div>

            <div className="filter-select-wrap">
              <input
                type="date"
                className="filter-select"
                value={draftCriteria.to}
                onChange={(e) => updateDraftCriteria({ to: e.target.value })}
                placeholder="To Date"
                aria-label="Filter to date"
              />
              <div className="filter-select-icon">
                <Calendar size={14} />
              </div>
            </div>

            <button
              className="dash-btn filter-apply-btn"
              type="submit"
              title="Apply filters"
              disabled={isLoading}
            >
              <Filter size={18} />
              <span className="filter-btn-text">Filter</span>
            </button>
          </div>
        </form>
      </header>

      <div className="tx-table-container animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="tx-header-row">
          <span>Action</span>
          <span>Asset</span>
          <span className="tx-col-extra">Amount</span>
          <span>Value</span>
          <span className="tx-col-extra">Date</span>
        </div>

        {wallets.length === 0 ? (
          <div className="tx-empty-state">
            <div className="tx-empty-content">
              <Wallet size={40} className="mb-4 opacity-20" />
              <p>No wallets connected yet. Link a wallet to sync transaction history.</p>
              <NavLink href="/connect-wallet" className="dash-btn dash-btn-primary mt-6">
                <Wallet size={18} /> Connect Wallet
              </NavLink>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="tx-empty-state">
            <div className="tx-empty-content">
              <History size={40} className="mb-4 opacity-20" />
              <p>
                {hasAppliedCriteria
                  ? 'No transactions found matching your criteria.'
                  : 'No transactions found.'}
              </p>
            </div>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="tx-item-row">
              <div>
                <span className={`tx-badge ${tx.status}`}>
                  {getStatusIcon(tx.status)} {tx.type}
                </span>
              </div>
              <div className="tx-asset-info">
                <div className="tx-token-avatar">{tx.symbol.slice(0, 2)}</div>
                <div className="flex flex-col">
                  <span className="tx-asset-name">{tx.asset}</span>
                  <span className="tx-sub">
                    {tx.symbol} - {tx.chainName}
                  </span>
                </div>
              </div>
              <div className="tx-col-extra">
                <span className="tx-val">
                  {tx.amount} {tx.symbol}
                </span>
              </div>
              <div>
                <span className="tx-val">
                  {tx.valueUsd === null ? 'N/A' : formatCurrency(tx.valueUsd)}
                </span>
                <span className="tx-sub md:hidden">{formatUtcTimestamp(tx.timestamp)}</span>
              </div>
              <div className="tx-col-extra">
                <span className="tx-sub" style={{ fontSize: '0.85rem' }}>
                  {formatUtcTimestamp(tx.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}

        <div className="tx-pagination-row p-6 bg-white/3 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="order-1 sm:order-2 w-full sm:w-auto">
            <AppPagination
              currentPage={page}
              totalPages={pagination?.totalPages ?? 1}
              hasMorePages={pagination?.hasNextPage ?? false}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { useNavigationLoading } from '@/components/NavigationLoadingProvider';
import { formatCurrency } from '@/lib/utils';

const SearchModal = ({ enableShortcut = true }: { enableShortcut?: boolean }) => {
  const router = useRouter();
  const { beginNavigation } = useNavigationLoading();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!enableShortcut) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleShortcut);

    return () => window.removeEventListener('keydown', handleShortcut);
  }, [enableShortcut]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load search results');
        }

        const data = (await response.json()) as { coins: SearchCoin[] };
        setResults(data.coins ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(err instanceof Error ? err.message : 'Failed to load search results');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, trimmedQuery, retryNonce]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
  };

  const handleSelect = (coinId: string) => {
    beginNavigation('Loading asset details...');
    closeModal();
    router.push(`/coins/${coinId}`);
  };

  return (
    <>
      <button type="button" className="nav-search-button" onClick={openModal}>
        <Search className="search-icon" size={16} />
        <span>Search</span>
        <span className="nav-search-kbd">Ctrl K</span>
      </button>

      {isMounted && isOpen
        ? createPortal(
            <div className="search-modal-overlay" onClick={closeModal} role="presentation">
              <div
                className="search-modal glass-card neon-glow-purple"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Search coins"
              >
                <div className="search-modal-header">
                  <div className="search-input-shell">
                    <Search size={18} className="search-input-icon" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by coin name or symbol"
                      className="search-input"
                    />
                  </div>

                  <button type="button" className="search-close-button" onClick={closeModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="search-results custom-scrollbar">
                  {isLoading ? (
                    <div className="search-state">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Searching assets...</span>
                    </div>
                  ) : error ? (
                    <div className="search-state">
                      <span>{error}</span>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setRetryNonce((current) => current + 1)}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : trimmedQuery ? (
                    results.length ? (
                      results.map((coin) => (
                        <button
                          type="button"
                          key={coin.id}
                          className="search-result-item"
                          onClick={() => handleSelect(coin.id)}
                        >
                          <div className="search-result-main">
                            <Image
                              src={coin.large || coin.thumb}
                              alt={coin.name}
                              width={40}
                              height={40}
                              className="search-result-icon"
                            />
                            <div className="search-result-copy">
                              <p className="search-result-name">{coin.name}</p>
                              <p className="search-result-symbol">{coin.symbol.toUpperCase()}</p>
                            </div>
                          </div>

                          <div className="search-result-meta">
                            <span className="search-result-rank">
                              {coin.market_cap_rank ? `#${coin.market_cap_rank}` : 'Unranked'}
                            </span>
                            <span className="search-result-price">
                              {coin.data?.price ? formatCurrency(coin.data.price) : 'Asset'}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="search-state">
                        <span>No matching assets found.</span>
                      </div>
                    )
                  ) : (
                    <div className="search-state">
                      <span>Start typing to search the market.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default SearchModal;

'use client';

import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/context/WatchlistContext';

interface WatchlistStarProps {
  coinId: string;
  initialIsWatched?: boolean;
  onWatchlistChange?: (coinId: string, isWatched: boolean) => void;
  size?: number;
}

const WatchlistStar = ({
  coinId,
  initialIsWatched = false,
  onWatchlistChange,
  size = 20,
}: WatchlistStarProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isWatched: isCoinWatched, toggleCoin } = useWatchlist();
  const [isPending, setIsPending] = useState(false);
  const [optimisticWatched, setOptimisticWatched] = useState<boolean | null>(null);

  const persistedIsWatched = isAuthenticated ? isCoinWatched(coinId) : initialIsWatched;
  const isWatched = optimisticWatched ?? persistedIsWatched;

  const displayName = coinId.charAt(0).toUpperCase() + coinId.slice(1);

  useEffect(() => {
    if (!isPending) {
      setOptimisticWatched(null);
    }
  }, [isPending, persistedIsWatched]);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Sign in to save assets to your watchlist');
      router.push('/login');
      return;
    }

    if (isPending) return;

    const previousState = isWatched;
    const nextState = !isWatched;
    const toastId = toast.loading(
      nextState ? `Adding ${displayName}...` : `Removing ${displayName}...`,
    );
    setIsPending(true);
    setOptimisticWatched(nextState);

    try {
      const savedState = await toggleCoin(coinId, nextState);
      setOptimisticWatched(savedState);
      onWatchlistChange?.(coinId, savedState);

      if (savedState) {
        toast.success(`${displayName} added to watchlist`, { id: toastId });
      } else {
        toast.info(`${displayName} removed from watchlist`, { id: toastId });
      }
    } catch (error) {
      setOptimisticWatched(previousState);
      toast.error(error instanceof Error ? error.message : 'Watchlist update failed', {
        id: toastId,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      className={cn(
        'hover:scale-125 transition-all relative z-20 p-1 rounded-full hover:bg-white/5 cursor-pointer',
        isWatched ? 'text-brand-orange' : 'text-muted-foreground hover:text-brand-orange',
        isPending && 'opacity-70',
      )}
      onClick={toggleWatchlist}
      disabled={isPending}
      aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Star size={size} fill={isWatched ? 'currentColor' : 'none'} />
    </button>
  );
};

export default WatchlistStar;

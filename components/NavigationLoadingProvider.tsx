'use client';

import RouteLoading from '@/components/RouteLoading';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type NavigationLoadingContextValue = {
  beginNavigation: (label?: string) => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);

  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }

  return context;
};

const NavigationLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [label, setLabel] = useState('Loading market intelligence...');
  const navigationStartRouteRef = useRef<string | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  // Always reset scroll position on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [routeKey]);

  // Keep the overlay visible until the route actually changes.
  useEffect(() => {
    const startRoute = navigationStartRouteRef.current;
    if (!startRoute || startRoute === routeKey) return;

    const timer = window.setTimeout(() => {
      navigationStartRouteRef.current = null;
      clearSafetyTimer();
      setIsNavigating(false);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [clearSafetyTimer, routeKey]);

  useEffect(() => () => clearSafetyTimer(), [clearSafetyTimer]);

  const beginNavigation = useCallback(
    (nextLabel?: string) => {
      if (nextLabel) setLabel(nextLabel);
      navigationStartRouteRef.current = routeKey;
      setIsNavigating(true);
      clearSafetyTimer();
      safetyTimerRef.current = window.setTimeout(() => {
        navigationStartRouteRef.current = null;
        setIsNavigating(false);
      }, 15000);
    },
    [clearSafetyTimer, routeKey],
  );

  const value = useMemo(
    () => ({
      beginNavigation,
    }),
    [beginNavigation],
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
      {isNavigating ? (
        <div className="route-overlay" role="status" aria-live="polite" aria-label={label}>
          <RouteLoading label={label} />
        </div>
      ) : null}
    </NavigationLoadingContext.Provider>
  );
};

export default NavigationLoadingProvider;

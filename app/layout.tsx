import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/sonner';
import NavigationLoadingProvider from '@/components/NavigationLoadingProvider';
import { AuthProvider } from '@/context/AuthContext';
import { WatchlistProvider } from '@/context/WatchlistContext';

export const metadata: Metadata = {
  title: 'Coinnex | Crypto Intelligence Dashboard',
  description:
    'A modern, sleek crypto intelligence dashboard with real-time market data and advanced analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Suspense fallback={null}>
          <NavigationLoadingProvider>
            <AuthProvider>
              <WatchlistProvider>
                <Header />
                {children}
              </WatchlistProvider>
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </NavigationLoadingProvider>
        </Suspense>
      </body>
    </html>
  );
}

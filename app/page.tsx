import React, { Suspense } from 'react';
import CoinOverview from '@/components/home/CoinOverview';
import TrendingCoins from '@/components/home/TrendingCoins';
import {
  CategoriesFallback,
  CoinOverviewFallback,
  TrendingCoinsFallback,
} from '@/components/home/fallback';
import Categories from '@/components/home/Categories';
import './page.css';

const Page = async () => {
  return (
    <main className="main-page page-enter stagger-container">
      <div className="hero-section">
        <h1 className="hero-title">
          Intelligence for <span className="brand-gradient-text">Future Finance</span>
        </h1>
        <p className="hero-description">
          Real-time crypto insights, institutional-grade charts, and market tracking.
        </p>
      </div>

      <section className="home-grid-section">
        <Suspense fallback={<CoinOverviewFallback />}>
          <CoinOverview />
        </Suspense>

        <Suspense fallback={<TrendingCoinsFallback />}>
          <TrendingCoins />
        </Suspense>
      </section>

      <section className="categories-section">
        <div className="categories-header">
          <h2 className="categories-title">Market Categories</h2>
        </div>
        <Suspense fallback={<CategoriesFallback />}>
          <Categories />
        </Suspense>
      </section>
    </main>
  );
};

export default Page;

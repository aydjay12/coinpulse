import React from 'react';
import DataTable from '@/components/DataTable';

type FallbackRow = {
  id: number;
};

export const CoinOverviewFallback = () => {
  return (
    <div
      id="coin-overview-fallback"
      className="glass-card rounded-2xl p-6 neon-glow-blue overflow-hidden animate-pulse"
    >
      <div className="flex items-center gap-4 mb-6 header">
        <div className="p-2 glass-card rounded-xl bg-white/5 w-16 h-16 header-image skeleton" />
        <div className="flex flex-col gap-2 info">
          <div className="h-4 w-24 bg-white/5 rounded header-line-sm skeleton" />
          <div className="h-8 w-48 bg-white/5 rounded header-line-lg skeleton" />
          <div className="h-6 w-32 bg-white/5 rounded skeleton" />
        </div>
      </div>
      <div className="h-[300px] bg-white/5 rounded-xl chart shadow-inner" />
    </div>
  );
};

export const TrendingCoinsFallback = () => {
  const columns: DataTableColumn<FallbackRow>[] = [
    {
      header: 'Name',
      cell: () => (
        <div className="flex items-center gap-3 name-link">
          <div className="w-8 h-8 rounded-full bg-white/5 name-image skeleton" />
          <div className="h-4 w-24 bg-white/5 rounded name-line skeleton" />
        </div>
      ),
    },
    {
      header: '24h Change',
      cell: () => (
        <div className="flex items-center gap-2 price-change">
          <div className="w-4 h-4 bg-white/5 rounded change-icon skeleton" />
          <div className="h-4 w-12 bg-white/5 rounded change-line skeleton" />
        </div>
      ),
    },
    {
      header: 'Price',
      cell: () => <div className="h-4 w-20 bg-white/5 rounded price-line skeleton" />,
    },
  ];

  const dummyData: FallbackRow[] = Array.from({ length: 6 }, (_, i) => ({ id: i }));

  return (
    <div
      id="trending-coins-fallback"
      className="glass-card rounded-2xl p-0 overflow-hidden neon-glow-purple h-full animate-pulse"
    >
      <div className="p-6 border-b border-white/10 bg-white/5">
        <div className="h-6 w-40 bg-white/5 rounded skeleton" />
      </div>
      <DataTable
        data={dummyData}
        columns={columns}
        rowKey={(item) => item.id}
        tableClassName="border-0"
        headerCellClassName="bg-transparent!"
        bodyCellClassName="border-white/5"
      />
    </div>
  );
};

export const CategoriesFallback = () => {
  const columns: DataTableColumn<FallbackRow>[] = [
    {
      header: 'Category',
      cellClassName: 'category-cell',
      cell: () => <div className="h-4 w-32 bg-white/5 rounded category-line skeleton" />,
    },
    {
      header: 'Top Gainers',
      cellClassName: 'top-gainers-cell',
      cell: () => (
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded-full bg-white/5 gainer-image skeleton" />
          <div className="w-6 h-6 rounded-full bg-white/5 gainer-image skeleton" />
          <div className="w-6 h-6 rounded-full bg-white/5 gainer-image skeleton" />
        </div>
      ),
    },
    {
      header: '24h Change',
      cellClassName: 'change-header-cell',
      cell: () => <div className="h-4 w-16 bg-white/5 rounded change-line skeleton" />,
    },
    {
      header: 'Market Cap',
      cellClassName: 'market-cap-cell',
      cell: () => <div className="h-4 w-24 bg-white/5 rounded skeleton" />,
    },
    {
      header: '24h Volume',
      cellClassName: 'volume-cell',
      cell: () => <div className="h-4 w-20 bg-white/5 rounded skeleton" />,
    },
  ];

  const dummyData: FallbackRow[] = Array.from({ length: 10 }, (_, i) => ({ id: i }));

  return (
    <div
      id="categories-fallback"
      className="glass-card rounded-2xl p-0 overflow-hidden neon-glow-blue animate-pulse"
    >
      <div className="p-6 border-b border-white/10 bg-white/5">
        <div className="h-6 w-48 bg-white/5 rounded skeleton" />
      </div>
      <DataTable
        data={dummyData}
        columns={columns}
        rowKey={(item) => item.id}
        tableClassName="border-0"
        headerCellClassName="bg-transparent!"
        bodyCellClassName="border-white/5"
      />
    </div>
  );
};

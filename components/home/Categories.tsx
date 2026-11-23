import { fetcher } from '@/lib/coingecko.actions';
import DataTable from '@/components/DataTable';
import Image from 'next/image';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { LayoutGrid, TrendingDown, TrendingUp } from 'lucide-react';
import { CategoriesFallback } from './fallback';
import './Categories.css';

const Categories = async () => {
  try {
    const categories = await fetcher<Category[]>('/coins/categories');

    const columns: DataTableColumn<Category>[] = [
      { header: 'Category', cellClassName: 'category-cell', cell: (category) => category.name },
      {
        header: 'Top Gainers',
        cellClassName: 'top-gainers-cell',
        cell: (category) =>
          category.top_3_coins.map((coin) => (
            <Image src={coin} alt={coin} key={coin} width={28} height={28} />
          )),
      },
      {
        header: '24h Change',
        cellClassName: 'change-header-cell',
        cell: (category) => {
          const isTrendingUp = category.market_cap_change_24h > 0;

          return (
            <div className={cn('change-cell', isTrendingUp ? 'text-green-500' : 'text-red-500')}>
              <p className="flex items-center">
                {formatPercentage(category.market_cap_change_24h)}
                {isTrendingUp ? (
                  <TrendingUp width={16} height={16} />
                ) : (
                  <TrendingDown width={16} height={16} />
                )}
              </p>
            </div>
          );
        },
      },
      {
        header: 'Market Cap',
        cellClassName: 'market-cap-cell',
        cell: (category) => formatCurrency(category.market_cap),
      },
      {
        header: '24h Volume',
        cellClassName: 'volume-cell',
        cell: (category) => formatCurrency(category.volume_24h),
      },
    ];

    return (
      <div id="categories" className="glass-card rounded-2xl p-0 overflow-hidden neon-glow-blue">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 glass-card rounded-lg bg-brand-blue/10 text-brand-blue">
              <LayoutGrid size={20} />
            </span>
            Market Categories
          </h4>
        </div>

        <DataTable
          columns={columns}
          data={categories?.slice(0, 10)}
          rowKey={(_, index) => index}
          tableClassName="border-0"
          headerCellClassName="bg-transparent!"
          bodyCellClassName="border-white/5"
        />
      </div>
    );
  } catch {
    return <CategoriesFallback />;
  }
};

export default Categories;

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BrainCircuit } from 'lucide-react';
import Converter from '@/components/Converter';

type CoinDetailsSidebarProps = {
  symbol: string;
  icon: string;
  priceList: Record<string, number>;
  coinDetails: {
    label: string;
    value: string;
    link?: string;
    linkText?: string;
  }[];
};

const CoinDetailsSidebar = ({ symbol, icon, priceList, coinDetails }: CoinDetailsSidebarProps) => {
  const intelligenceRef = useRef<HTMLDivElement | null>(null);
  const [syncedHeight, setSyncedHeight] = useState<number | null>(null);

  useEffect(() => {
    const syncHeights = () => {
      if (typeof window === 'undefined' || window.innerWidth < 1024) {
        setSyncedHeight(null);
        return;
      }

      const priceCard = document.querySelector<HTMLElement>('.price-analysis-card');
      if (!priceCard) return;

      setSyncedHeight(Math.round(priceCard.getBoundingClientRect().height));
    };

    const observer = new ResizeObserver(() => syncHeights());
    const priceCard = document.querySelector<HTMLElement>('.price-analysis-card');

    if (priceCard) {
      observer.observe(priceCard);
    }

    window.addEventListener('resize', syncHeights);
    syncHeights();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeights);
    };
  }, []);

  return (
    <aside className="lg:w-1/3 min-w-0 flex flex-col gap-8 coin-sidebar">
      <Converter symbol={symbol} icon={icon} priceList={priceList} />

      <div
        ref={intelligenceRef}
        className="glass-card rounded-2xl p-6 neon-glow-purple flex flex-col coin-intelligence-card"
        style={syncedHeight ? { minHeight: `${syncedHeight}px` } : undefined}
      >
        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="p-1.5 glass-card rounded-lg bg-brand-purple/10 text-brand-purple">
            <BrainCircuit size={20} />
          </span>
          Asset Intelligence
        </h4>

        <ul className="space-y-4 flex-1">
          {coinDetails.map(({ label, value, link, linkText }, index) => (
            <li
              key={index}
              className="flex flex-col gap-1 pb-4 border-b border-white/5 last:border-0 last:pb-0"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {label}
              </p>

              {link ? (
                <div className="flex items-center gap-2 text-foreground hover:text-brand-purple transition-colors group cursor-pointer">
                  <Link href={link} target="_blank" className="font-semibold text-sm">
                    {linkText || label}
                  </Link>
                  <ArrowUpRight
                    size={14}
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ) : (
                <p className="text-base font-bold text-foreground">{value}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default CoinDetailsSidebar;

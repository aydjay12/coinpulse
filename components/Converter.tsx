'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';
import './Converter.css';

const Converter = ({ symbol, icon, priceList }: ConverterProps) => {
  const [currency, setCurrency] = useState('usd');
  const [amount, setAmount] = useState('10');

  const convertedPrice = (parseFloat(amount) || 0) * (priceList[currency] || 0);

  return (
    <div id="converter" className="glass-card rounded-2xl p-6 neon-glow-purple">
      <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ArrowRightLeft className="text-brand-purple" size={24} />
        {symbol.toUpperCase()} Converter
      </h4>

      <div className="space-y-4">
        <div className="card-glass-top glass-card rounded-xl p-4 border-white/10 bg-white/5 flex items-center justify-between gap-4">
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent border-none text-xl font-bold focus-visible:ring-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Image src={icon} alt={symbol} width={24} height={24} className="rounded-full" />
            <span className="font-bold text-sm">{symbol.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="p-2 glass-card rounded-full border-brand-purple/50 bg-brand-purple/10 text-brand-purple shadow-lg">
            <ArrowRightLeft size={20} />
          </div>
        </div>

        <div className="card-glass-bottom glass-card rounded-xl p-4 border-white/10 bg-white/5 flex items-center justify-between gap-4">
          <p className="text-xl font-bold brand-gradient-text">
            {formatCurrency(convertedPrice, 2, currency, false)}
          </p>

          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-fit bg-white/10 border-white/10 hover:bg-white/20 transition-colors h-10 px-3 rounded-lg py-1.5 focus:ring-0 outline-none">
              <SelectValue className="text-sm font-bold">{currency.toUpperCase()}</SelectValue>
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="bg-dark-900 border-white/10 text-foreground"
            >
              {Object.keys(priceList).map((currencyCode) => (
                <SelectItem
                  value={currencyCode}
                  key={currencyCode}
                  className="hover:bg-white/10 cursor-pointer"
                >
                  {currencyCode.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
export default Converter;

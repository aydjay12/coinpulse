'use client';

import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryHref?: string;
  retryLabel?: string;
  className?: string;
  icon?: React.ReactNode;
}

const ErrorState = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading the data. Please try again.',
  onRetry,
  retryHref,
  retryLabel = 'Try Again',
  className,
  icon,
}: ErrorStateProps) => {
  const retryClassName =
    'dash-btn dash-btn-primary flex items-center gap-2 px-8 py-3 transform transition-transform hover:scale-100 active:scale-95';
  const retryStyle: React.CSSProperties = {
    background: 'linear-gradient(to right, var(--color-brand-blue), var(--color-brand-purple))',
    border: 'none',
    borderRadius: '0.85rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    textDecoration: 'none',
  };

  return (
    <div
      className={cn(
        'glass-card rounded-3xl p-16 flex flex-col items-center text-center gap-6 neon-glow-red animate-in fade-in slide-in-from-bottom-4 duration-500',
        className,
      )}
    >
      <div className="p-5 rounded-full bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
        {icon || <AlertCircle size={40} />}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-muted-foreground max-w-sm font-medium leading-relaxed">{message}</p>
      </div>

      {onRetry ? (
        <button type="button" onClick={onRetry} className={retryClassName} style={retryStyle}>
          <RefreshCcw size={18} />
          {retryLabel}
        </button>
      ) : retryHref ? (
        <a href={retryHref} className={retryClassName} style={retryStyle}>
          <RefreshCcw size={18} />
          {retryLabel}
        </a>
      ) : null}
    </div>
  );
};

export default ErrorState;

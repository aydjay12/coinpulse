'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  ExternalLink,
  ShieldCheck,
  Plus,
  Copy,
  Trash2,
  ArrowRight,
  Network,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import ErrorState from '@/components/ErrorState';
import NavLink from '@/components/NavLink';
import RouteLoading from '@/components/RouteLoading';
import type { LinkedWallet } from '@/lib/wallets/types';
import './connect-wallet.css';

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const SUPPORTED_NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', desc: 'Largest EVM ecosystem', icon: 'E' },
  { id: 'polygon', name: 'Polygon', desc: 'Low-cost retail activity', icon: 'P' },
  { id: 'bnb', name: 'BNB Chain', desc: 'High-volume retail network', icon: 'B' },
  { id: 'base', name: 'Base', desc: 'Fast-growing Ethereum L2', icon: 'B' },
  { id: 'arbitrum', name: 'Arbitrum', desc: 'Leading Ethereum L2', icon: 'A' },
];

type WalletsResponse = {
  success: boolean;
  wallets?: LinkedWallet[];
  message?: string;
};

type WalletResponse = {
  success: boolean;
  wallet?: LinkedWallet;
  message?: string;
};

function displayAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWalletPage() {
  const [address, setAddress] = useState('');
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletToDisconnect, setWalletToDisconnect] = useState<LinkedWallet | null>(null);

  const loadWallets = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wallets', { signal });
      const data = (await response.json()) as WalletsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load wallets');
      }

      setWallets(data.wallets ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadWallets(controller.signal);

    return () => controller.abort();
  }, [loadWallets]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextAddress = address.trim();
    if (!WALLET_ADDRESS_PATTERN.test(nextAddress)) {
      toast.error('Enter a valid EVM wallet address.');
      return;
    }

    const toastId = toast.loading('Linking wallet...');
    setIsSaving(true);

    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: nextAddress }),
      });
      const data = (await response.json()) as WalletResponse;

      if (!response.ok || !data.success || !data.wallet) {
        throw new Error(data.message || 'Failed to connect wallet');
      }

      setWallets((current) => [data.wallet!, ...current]);
      setAddress('');
      toast.success('Wallet linked for read-only analytics', { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect wallet', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    toast.success('Address copied to clipboard');
  };

  const disconnectWallet = async () => {
    if (!walletToDisconnect) return;

    const toastId = toast.loading('Disconnecting wallet...');

    try {
      const response = await fetch(`/api/wallets/${walletToDisconnect.address}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to disconnect wallet');
      }

      setWallets((current) =>
        current.filter((wallet) => wallet.address !== walletToDisconnect.address),
      );
      setWalletToDisconnect(null);
      toast.success('Wallet disconnected', { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect wallet', {
        id: toastId,
      });
    }
  };

  if (isLoading) {
    return <RouteLoading label="Loading linked wallets..." />;
  }

  if (error) {
    return (
      <main className="main-container py-8 lg:py-12 min-h-[70vh] flex flex-col items-center justify-center w-full">
        <ErrorState
          title="Wallets Offline"
          message={error}
          onRetry={() => loadWallets()}
          className="w-full"
        />
      </main>
    );
  }

  return (
    <div className="main-container connect-wallet-container">
      <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
          Connect <span className="brand-gradient-text">Wallet Bridge</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl font-medium">
          Add EVM wallet addresses for read-only portfolio intelligence across the Phase 1 networks.
        </p>
      </header>

      <div className="wallet-grid animate-in fade-in slide-in-from-bottom-6 duration-700">
        {SUPPORTED_NETWORKS.map((network) => (
          <div key={network.id} className="wallet-connect-card wallet-network-card">
            <div className="wallet-icon-box">
              <span className="text-2xl font-bold">{network.icon}</span>
            </div>
            <div className="wallet-card-content">
              <h3 className="wallet-card-title">{network.name}</h3>
              <p className="wallet-card-desc">{network.desc}</p>
            </div>
            <Network size={20} className="wallet-card-network-icon text-muted-foreground" />
          </div>
        ))}
      </div>

      <div className="wallet-connect-input-group animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h2 className="text-2xl font-bold text-white mb-2 ml-1">Manual Address Input</h2>
        <div className="address-input-shell">
          <label className="text-sm text-muted-foreground mb-4 block">
            Enter an Ethereum-compatible address to track its positions.
          </label>
          <form onSubmit={handleConnect}>
            <input
              type="text"
              className="wallet-address-input"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSaving}
            />
            <button
              type="submit"
              className="connect-wallet-btn disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              <Plus size={20} /> {isSaving ? 'Connecting...' : 'Connect Wallet for Analytics'}
            </button>
          </form>
          <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
            <ShieldCheck size={16} className="text-green-500" />
            Read-only access. Your funds are always safe.
          </div>
        </div>
      </div>

      <div className="connected-wallets-grid animate-in fade-in duration-1000">
        <div className="col-span-full">
          <h2 className="linked-addresses-title text-2xl font-bold text-white mb-6 ml-1 flex items-center gap-2">
            <ExternalLink size={22} className="text-brand-purple" /> Linked Addresses (
            {wallets.length})
          </h2>
        </div>

        {wallets.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-muted-foreground text-lg">
              No digital signatures linked for intelligence syncing yet.
            </p>
          </div>
        ) : (
          wallets.map((wallet) => (
            <div key={wallet.id} className="connected-wallet-item">
              <NavLink
                href={`/portfolio/${wallet.address}`}
                className="wallet-meta wallet-meta-link"
              >
                <div className="wallet-connected-top">
                  <div className="wallet-meta-icon">
                    <Wallet size={20} />
                  </div>
                  <div className="wallet-details">
                    <span className="wallet-name text-lg">{wallet.label}</span>
                    <span className="wallet-addr text-xs mt-1">
                      {displayAddress(wallet.address)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Synced across {wallet.chains.length} protocol networks
                </div>

                <ArrowRight size={20} className="wallet-row-arrow" />
              </NavLink>

              <div className="wallet-actions">
                <button
                  type="button"
                  onClick={() => copyAddress(wallet.address)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted-foreground cursor-pointer hover:text-white"
                  title="Copy address"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setWalletToDisconnect(wallet)}
                  className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all text-red-500 cursor-pointer hover:scale-110"
                  title="Disconnect"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(walletToDisconnect)}
        title="Disconnect wallet?"
        description="This removes the address from your CoinPulse account. You can add it again later."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setWalletToDisconnect(null)}
        onConfirm={disconnectWallet}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { detectWallets } from '../lib/wallets';
import type { WalletProvider, WalletAccount, Network } from '../lib/wallets/types';

interface Props {
  onConnect: (provider: WalletProvider, account: WalletAccount, network: Network) => void;
  onDisconnect: () => void;
  connected: boolean;
  account: WalletAccount | null;
  providerName: string | null;
}

export default function WalletConnect({ onConnect, onDisconnect, connected, account, providerName }: Props) {
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAvailableWallets(detectWallets()), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleConnect = async (provider: WalletProvider) => {
    setConnecting(true);
    setError(null);
    setShowDropdown(false);
    try {
      const account = await provider.connect();
      const network = await provider.getNetwork();
      onConnect(provider, account, network);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  if (connected && account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="text-zinc-400">{providerName}</div>
          <div className="font-mono text-zinc-300">{account.address.slice(0, 8)}...{account.address.slice(-6)}</div>
        </div>
        <button onClick={onDisconnect} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700">Disconnect</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)} disabled={connecting} className={`px-4 py-2 rounded-lg font-medium ${connecting ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-amber-600 hover:bg-amber-500 text-zinc-950'}`}>
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10">
          {availableWallets.length > 0 ? (
            <div className="p-2">
              {availableWallets.map((wallet) => (
                <button key={wallet.name} onClick={() => handleConnect(wallet)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded">{wallet.name}</button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-500 text-sm">
              <p>No wallets detected</p>
              <p className="mt-2">Install <a href="https://unisat.io" target="_blank" className="text-amber-500 hover:underline">Unisat</a>, <a href="https://www.xverse.app" target="_blank" className="text-amber-500 hover:underline">Xverse</a>, or <a href="https://leather.io" target="_blank" className="text-amber-500 hover:underline">Leather</a></p>
            </div>
          )}
          <div className="border-t border-zinc-700 p-2">
            <button onClick={() => setShowDropdown(false)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded text-zinc-400 text-sm">Manual signing (advanced)</button>
          </div>
        </div>
      )}
      {error && <div className="absolute top-full right-0 mt-2 text-red-400 text-sm">{error}</div>}
    </div>
  );
}

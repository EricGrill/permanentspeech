import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '../components/Editor';
import WalletConnect from '../components/WalletConnect';
import FeeSelector from '../components/FeeSelector';
import PublishButton from '../components/PublishButton';
import type { WalletProvider, WalletAccount, Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Home({ network }: Props) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<Network>(network);
  const [feeRate, setFeeRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [successTxid, setSuccessTxid] = useState<string | null>(null);

  const handleConnect = (p: WalletProvider, a: WalletAccount, n: Network) => {
    setProvider(p);
    setAccount(a);
    setWalletNetwork(n);
    setError(null);
  };

  const handleDisconnect = () => {
    setProvider(null);
    setAccount(null);
    setError(null);
  };

  const handleSuccess = (txid: string) => setSuccessTxid(txid);
  const handleError = (err: string) => setError(err);

  const activeNetwork = provider ? walletNetwork : network;

  if (successTxid) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-emerald-400 text-5xl">✓</div>
        <h1 className="text-2xl font-bold">Published!</h1>
        <p className="text-zinc-400">Your message has been broadcast to the Bitcoin {activeNetwork}.</p>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 max-w-md mx-auto">
          <div className="text-zinc-500 text-sm mb-1">Transaction ID</div>
          <div className="font-mono text-sm break-all">{successTxid}</div>
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate(`/tx/${successTxid}`)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded font-medium">View Message</button>
          <button onClick={() => { setSuccessTxid(null); setMessage(''); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700">Publish Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publish to Bitcoin</h1>
          <p className="text-zinc-500 mt-1">Write a message. Make it permanent.</p>
        </div>
        <WalletConnect onConnect={handleConnect} onDisconnect={handleDisconnect} connected={!!provider} account={account} providerName={provider?.name || null} />
      </div>

      {provider && walletNetwork !== network && (
        <div className="bg-amber-600/20 border border-amber-500 rounded-lg p-4 text-amber-400 text-sm">
          Your wallet is connected to {walletNetwork}. The network selector has been updated to match.
        </div>
      )}

      <Editor value={message} onChange={setMessage} disabled={false} />

      <FeeSelector network={activeNetwork} onSelect={setFeeRate} selectedRate={feeRate} />

      {error && <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 text-red-400">{error}</div>}

      <PublishButton message={message} provider={provider} account={account} network={activeNetwork} feeRate={feeRate} onSuccess={handleSuccess} onError={handleError} />
    </div>
  );
}

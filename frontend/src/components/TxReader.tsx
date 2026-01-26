import { useState, useEffect } from 'react';
import { getTransaction } from '../lib/api';
import { decodeOpReturn, decodeOpReturnHex } from '../lib/bitcoin';
import type { Network } from '../lib/wallets/types';
import ContentWarning from './ContentWarning';

interface Props {
  txid: string;
  network: Network;
}

interface TxData {
  message: string | null;
  messageHex: string | null;
  blockhash?: string;
  blocktime?: number;
  confirmations: number;
}

export default function TxReader({ txid, network }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txData, setTxData] = useState<TxData | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTransaction(txid, network)
      .then((tx) => {
        setTxData({
          message: decodeOpReturn(tx.hex),
          messageHex: decodeOpReturnHex(tx.hex),
          blockhash: tx.blockhash,
          blocktime: tx.blocktime,
          confirmations: tx.confirmations,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch transaction'))
      .finally(() => setLoading(false));
  }, [txid, network]);

  if (loading) return <div className="text-center py-12"><div className="text-zinc-500">Loading transaction...</div></div>;

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <p className="text-zinc-500 text-sm">You can verify this transaction on:</p>
        <div className="flex gap-4 justify-center mt-2">
          <a href={`https://mempool.space/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">mempool.space</a>
          <a href={`https://blockstream.info/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">blockstream.info</a>
        </div>
      </div>
    );
  }

  if (!txData) return null;

  if (showWarning && !dismissed) {
    return <ContentWarning onProceed={() => { setShowWarning(false); setDismissed(true); }} onCancel={() => window.history.back()} />;
  }

  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        {txData.message ? (
          <div className="font-mono text-xl text-zinc-100 whitespace-pre-wrap break-all">{txData.message}</div>
        ) : (
          <div className="text-zinc-500 italic">No readable text content found in this transaction.</div>
        )}
      </div>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-300">Transaction Details</h2>
        <div className="grid gap-3 text-sm">
          <div><div className="text-zinc-500">Transaction ID</div><div className="font-mono text-zinc-300 break-all">{txid}</div></div>
          <div><div className="text-zinc-500">Status</div><div className={txData.confirmations > 0 ? 'text-emerald-400' : 'text-amber-400'}>{txData.confirmations > 0 ? `Confirmed (${txData.confirmations} confirmations)` : 'Unconfirmed (in mempool)'}</div></div>
          {txData.blocktime && <div><div className="text-zinc-500">Block Time</div><div className="text-zinc-300">{formatTime(txData.blocktime)}</div></div>}
          {txData.blockhash && <div><div className="text-zinc-500">Block Hash</div><div className="font-mono text-zinc-300 break-all text-xs">{txData.blockhash}</div></div>}
          {txData.messageHex && <div><div className="text-zinc-500">Raw Payload (hex)</div><div className="font-mono text-zinc-400 break-all text-xs">{txData.messageHex}</div></div>}
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-zinc-500">Verify on:</span>
        <a href={`https://mempool.space/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">mempool.space</a>
        <a href={`https://blockstream.info/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">blockstream.info</a>
      </div>
    </div>
  );
}

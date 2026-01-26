import { useState, useEffect } from 'react';
import { getFeeEstimate, type FeeEstimate } from '../lib/api';
import type { Network } from '../lib/wallets/types';

interface Props {
  network: Network;
  onSelect: (feeRate: number) => void;
  selectedRate: number;
}

type FeeLevel = 'low' | 'medium' | 'high' | 'custom';

export default function FeeSelector({ network, onSelect, selectedRate }: Props) {
  const [estimate, setEstimate] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<FeeLevel>('medium');
  const [customRate, setCustomRate] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    getFeeEstimate(network)
      .then((est) => { setEstimate(est); onSelect(est.medium); })
      .catch(() => setError('Failed to fetch fee estimates'))
      .finally(() => setLoading(false));
  }, [network]);

  const handleLevelChange = (newLevel: FeeLevel) => {
    setLevel(newLevel);
    if (newLevel !== 'custom' && estimate) onSelect(estimate[newLevel]);
  };

  const handleCustomChange = (value: string) => {
    setCustomRate(value);
    const rate = parseInt(value, 10);
    if (!isNaN(rate) && rate > 0) onSelect(rate);
  };

  if (loading) return <div className="text-zinc-500 text-sm">Loading fee estimates...</div>;

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-red-400 text-sm">{error}</div>
        <div className="flex items-center gap-2">
          <input type="number" value={customRate} onChange={(e) => handleCustomChange(e.target.value)} placeholder="Enter sat/vB" className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
          <span className="text-zinc-500 text-sm">sat/vB</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-300">Transaction fee</label>
      <div className="flex gap-2">
        {(['low', 'medium', 'high'] as const).map((l) => (
          <button key={l} onClick={() => handleLevelChange(l)} className={`flex-1 px-3 py-2 rounded border text-sm ${level === l ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
            <div className="font-medium capitalize">{l}</div>
            <div className="text-xs opacity-75">{estimate?.[l]} sat/vB</div>
          </button>
        ))}
        <button onClick={() => handleLevelChange('custom')} className={`px-3 py-2 rounded border text-sm ${level === 'custom' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>Custom</button>
      </div>
      {level === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="number" value={customRate} onChange={(e) => handleCustomChange(e.target.value)} placeholder="Enter rate" className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
          <span className="text-zinc-500 text-sm">sat/vB</span>
        </div>
      )}
      <div className="text-zinc-500 text-xs">Current selection: {selectedRate} sat/vB</div>
    </div>
  );
}
